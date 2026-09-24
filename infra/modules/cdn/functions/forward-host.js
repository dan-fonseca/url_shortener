// Viewer-request function for API behaviors.
// API Gateway rejects requests whose Host header isn't its own, so CloudFront
// must not forward Host. This copies the public host into x-forwarded-host so
// the API can build short URLs on whatever domain the visitor used.
function handler(event) {
  var request = event.request;
  if (request.headers.host) {
    request.headers['x-forwarded-host'] = { value: request.headers.host.value };
  }
  return request;
}
