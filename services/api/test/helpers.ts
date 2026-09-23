import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

export function makeEvent(overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/',
    rawQueryString: '',
    headers: { host: 'abc123.execute-api.us-east-1.amazonaws.com', 'x-forwarded-host': 'sho.rt' },
    isBase64Encoded: false,
    requestContext: {
      accountId: '123456789012',
      apiId: 'abc123',
      domainName: 'abc123.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'abc123',
      http: {
        method: 'GET',
        path: '/',
        protocol: 'HTTP/1.1',
        sourceIp: '1.2.3.4',
        userAgent: 'test',
      },
      requestId: 'req-1',
      routeKey: '$default',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 0,
    },
    ...overrides,
  };
}

export const context = { awsRequestId: 'test-request' } as Context;

export function body(result: { body?: string }): Record<string, unknown> {
  return JSON.parse(result.body ?? '{}');
}
