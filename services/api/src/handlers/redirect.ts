import { withErrorHandling } from '../lib/handler.js';
import { html, redirect } from '../lib/http.js';
import { resolveAndCountClick } from '../lib/repository.js';
import { isValidCode } from '../lib/validation.js';

/** GET /{code} -> 302 to the destination. GET / -> 302 to the web app. */
export const handler = withErrorHandling('redirect', async (event) => {
  const code = event.pathParameters?.code;

  if (code === undefined) return redirect('/app/');
  if (!isValidCode(code)) return notFound();

  const url = await resolveAndCountClick(code);
  return url ? redirect(url) : notFound();
});

function notFound() {
  return html(
    404,
    `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Link not found</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#333}
main{text-align:center}a{color:#4f46e5}</style></head>
<body><main><h1>Link not found</h1><p>This short link doesn't exist or has expired.</p>
<p><a href="/app/">Create a new short link</a></p></main></body>
</html>`,
  );
}
