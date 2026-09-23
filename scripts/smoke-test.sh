#!/usr/bin/env bash
# End-to-end check against a deployed stack, through CloudFront:
#   frontend loads -> create link -> redirect works -> click counted -> 404 for unknown code.
# Usage: scripts/smoke-test.sh https://d1234.cloudfront.net
set -euo pipefail

BASE="${1:?usage: smoke-test.sh <base-url>}"
BASE="${BASE%/}"

pass() { echo "  ✓ $*"; }
fail() { echo "  ✗ $*" >&2; exit 1; }

echo "Smoke testing $BASE"

# A brand-new distribution can take a moment to answer on every edge.
for attempt in $(seq 1 30); do
  status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/app/" || true)
  [[ "$status" == "200" ]] && break
  echo "  … frontend returned $status (attempt $attempt/30), retrying"
  sleep 10
done
[[ "$status" == "200" ]] || fail "frontend did not return 200"
pass "frontend served from /app/"

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")
[[ "$status" == "302" ]] || fail "root returned $status, expected 302"
pass "root redirects to the app"

target="https://example.com/?smoke=$(date +%s)"
response=$(curl -fsS -X POST "$BASE/api/links" \
  -H 'content-type: application/json' \
  -d "{\"url\":\"$target\",\"ttlDays\":1}")
code=$(jq -r '.code' <<<"$response")
[[ -n "$code" && "$code" != "null" ]] || fail "create returned no code: $response"
pass "created /$code"

location=$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE/$code")
[[ "$location" == "$target" ]] || fail "redirect went to '$location', expected '$target'"
pass "redirect resolves to destination"

clicks=$(curl -fsS "$BASE/api/links/$code" | jq -r '.clicks')
(( clicks >= 1 )) || fail "expected at least 1 click, got $clicks"
pass "click counted ($clicks)"

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/doesnotexist123")
[[ "$status" == "404" ]] || fail "unknown code returned $status, expected 404"
pass "unknown code returns 404"

status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/links" \
  -H 'content-type: application/json' -d '{"url":"javascript:alert(1)"}')
[[ "$status" == "400" ]] || fail "invalid URL returned $status, expected 400"
pass "invalid URL rejected"

echo "All smoke tests passed."
