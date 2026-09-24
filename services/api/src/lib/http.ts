import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export type HttpResult = APIGatewayProxyStructuredResultV2;

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function json(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): HttpResult {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...SECURITY_HEADERS,
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function redirect(location: string): HttpResult {
  return {
    statusCode: 302,
    headers: {
      location,
      // 302 + no-store: every visit reaches the API so clicks are counted and
      // expired/deleted links stop working immediately.
      'cache-control': 'private, no-store',
      ...SECURITY_HEADERS,
    },
  };
}

export function html(statusCode: number, body: string): HttpResult {
  return {
    statusCode,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
      ...SECURITY_HEADERS,
    },
    body,
  };
}

export function parseJsonBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) throw new HttpError(400, 'Request body is required');
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

/**
 * Public origin the client used (e.g. https://d123.cloudfront.net or a custom
 * domain). CloudFront can't forward `Host` to API Gateway, so a CloudFront
 * Function copies it into `x-forwarded-host`. PUBLIC_BASE_URL overrides both.
 */
export function publicBaseUrl(event: APIGatewayProxyEventV2): string {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const host =
    event.headers['x-forwarded-host'] ?? event.headers.host ?? event.requestContext.domainName;
  return `https://${host}`;
}
