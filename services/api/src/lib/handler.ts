import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { ZodError } from 'zod';
import { HttpError, json, type HttpResult } from './http.js';
import { logger } from './logger.js';

type Handler = (event: APIGatewayProxyEventV2, context: Context) => Promise<HttpResult>;

/**
 * Wraps a handler with request-scoped logging and uniform error mapping:
 * HttpError -> its status, ZodError -> 400 with field issues, anything else -> 500
 * (details are logged, never leaked to the client).
 */
export function withErrorHandling(name: string, fn: Handler): Handler {
  return async (event, context) => {
    const started = Date.now();
    logger.setContext({ handler: name, requestId: context.awsRequestId });
    let result: HttpResult;
    try {
      result = await fn(event, context);
    } catch (err) {
      result = toErrorResponse(err);
    }
    logger.info('request completed', {
      method: event.requestContext.http.method,
      path: event.rawPath,
      status: result.statusCode,
      durationMs: Date.now() - started,
    });
    return result;
  };
}

function toErrorResponse(err: unknown): HttpResult {
  if (err instanceof HttpError) {
    return json(err.statusCode, {
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }
  if (err instanceof ZodError) {
    return json(400, {
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  logger.error('unhandled error', { err });
  return json(500, { error: 'Internal server error' });
}
