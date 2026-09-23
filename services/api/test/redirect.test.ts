import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../src/handlers/redirect.js';
import { context, makeEvent } from './helpers.js';

const ddb = mockClient(DynamoDBDocumentClient);

const get = (code?: string) =>
  handler(
    makeEvent({ rawPath: `/${code ?? ''}`, pathParameters: code ? { code } : undefined }),
    context,
  );

describe('GET /{code}', () => {
  beforeEach(() => {
    ddb.reset();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('redirects and counts the click atomically', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { code: 'abc1234', url: 'https://example.com' } });

    const res = await get('abc1234');

    expect(res.statusCode).toBe(302);
    expect(res.headers?.location).toBe('https://example.com');
    expect(res.headers?.['cache-control']).toContain('no-store');

    const input = ddb.commandCalls(UpdateCommand)[0]!.args[0].input;
    expect(input.Key).toEqual({ code: 'abc1234' });
    expect(input.UpdateExpression).toContain('ADD clicks :one');
    expect(input.ConditionExpression).toContain('expiresAt > :nowEpoch');
  });

  it('returns 404 for unknown or expired codes', async () => {
    ddb
      .on(UpdateCommand)
      .rejects(new ConditionalCheckFailedException({ message: 'no', $metadata: {} }));

    const res = await get('missing');

    expect(res.statusCode).toBe(404);
    expect(res.headers?.['content-type']).toContain('text/html');
  });

  it('returns 404 without touching DynamoDB for malformed codes', async () => {
    const res = await get('bad.code');
    expect(res.statusCode).toBe(404);
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('sends the root path to the web app', async () => {
    const res = await get();
    expect(res.statusCode).toBe(302);
    expect(res.headers?.location).toBe('/app/');
  });

  it('returns 500 on unexpected DynamoDB errors', async () => {
    ddb.on(UpdateCommand).rejects(new Error('throttled'));
    const res = await get('abc1234');
    expect(res.statusCode).toBe(500);
  });
});
