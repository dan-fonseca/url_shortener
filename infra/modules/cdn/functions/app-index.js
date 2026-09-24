// Viewer-request function for the /app/* behavior (S3 has no directory indexes).
// /app  -> 301 /app/
// /app/ -> /app/index.html
function handler(event) {
  var request = event.request;
  if (request.uri === '/app') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/app/' } },
    };
  }
  if (request.uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  return request;
}
