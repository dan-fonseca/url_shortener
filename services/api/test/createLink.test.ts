import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../src/handlers/createLink.js';
import { body, context, makeEvent } from './helpers.js';

const ddb = mockClient(DynamoDBDocumentClient);

const conflict = () => new ConditionalCheckFailedException({ message: 'exists', $metadata: {} });

const post = (payload: unknown, raw?: string) =>
  handler(
    makeEvent({
      rawPath: '/api/links',
      body: raw ?? JSON.stringify(payload),
      requestContext: {
        ...makeEvent().requestContext,
        http: { ...makeEvent().requestContext.http, method: 'POST' },
      },
    }),
    context,
  );

describe('POST /api/links', () => {
  beforeEach(() => {
    ddb.reset();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.PUBLIC_BASE_URL;
  });

  it('creates a link with a random code', async () => {
    ddb.on(PutCommand).resolves({});

    const res = await post({ url: 'https://example.com/some/long/path?q=1' });

    expect(res.statusCode).toBe(201);
    const json = body(res);
    expect(json.code).toMatch(/^[0-9A-Za-z]{7}$/);
    expect(json.shortUrl).toBe(`https://sho.rt/${json.code}`);
    expect(json.expiresAt).toBeNull();

    const put = ddb.commandCalls(PutCommand)[0]!.args[0].input;
    expect(put.ConditionExpression).toBe('attribute_not_exists(code)');
    expect(put.Item).toMatchObject({
      url: 'https://example.com/some/long/path?q=1',
      clicks: 0,
      custom: false,
    });
  });

  it('retries on code collision', async () => {
    ddb.on(PutCommand).rejectsOnce(conflict()).resolves({});

    const res = await post({ url: 'https://example.com' });

    expect(res.statusCode).toBe(201);
    expect(ddb.commandCalls(PutCommand)).toHaveLength(2);
  });

  it('gives up after repeated collisions', async () => {
    ddb.on(PutCommand).rejects(conflict());

    const res = await post({ url: 'https://example.com' });

    expect(res.statusCode).toBe(500);
    expect(body(res)).toEqual({ error: 'Internal server error' });
  });

  it('uses a custom alias and sets expiry', async () => {
    ddb.on(PutCommand).resolves({});

    const res = await post({ url: 'https://example.com', alias: 'my-link', ttlDays: 7 });

    expect(res.statusCode).toBe(201);
    const json = body(res);
    expect(json.code).toBe('my-link');
    expect(typeof json.expiresAt).toBe('string');
    const item = ddb.commandCalls(PutCommand)[0]!.args[0].input.Item!;
    expect(item.custom).toBe(true);
    expect(item.expiresAt).toBeGreaterThan(Date.now() / 1000 + 6 * 86_400);
  });

  it('returns 409 when the alias is taken', async () => {
    ddb.on(PutCommand).rejects(conflict());

    const res = await post({ url: 'https://example.com', alias: 'taken' });

    expect(res.statusCode).toBe(409);
    expect(ddb.commandCalls(PutCommand)).toHaveLength(1);
  });

  it.each([
    ['non-http scheme', { url: 'javascript:alert(1)' }],
    ['relative url', { url: '/relative' }],
    ['reserved alias', { url: 'https://example.com', alias: 'api' }],
    ['alias with dot', { url: 'https://example.com', alias: 'a.b.c' }],
    ['ttl too long', { url: 'https://example.com', ttlDays: 9999 }],
    ['url too long', { url: `https://example.com/${'a'.repeat(2100)}` }],
  ])('rejects %s with 400', async (_name, payload) => {
    const res = await post(payload);
    expect(res.statusCode).toBe(400);
    expect(body(res).error).toBe('Validation failed');
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('rejects malformed JSON', async () => {
    const res = await post(undefined, '{not json');
    expect(res.statusCode).toBe(400);
  });

  it('rejects an empty body', async () => {
    const res = await handler(makeEvent({ body: undefined }), context);
    expect(res.statusCode).toBe(400);
  });

  it('decodes base64 bodies', async () => {
    ddb.on(PutCommand).resolves({});
    const encoded = Buffer.from(JSON.stringify({ url: 'https://example.com' })).toString('base64');
    const res = await handler(makeEvent({ body: encoded, isBase64Encoded: true }), context);
    expect(res.statusCode).toBe(201);
  });

  it('refuses to shorten its own links (redirect loops)', async () => {
    const res = await post({ url: 'https://sho.rt/abc1234' });
    expect(res.statusCode).toBe(400);
  });

  it('prefers PUBLIC_BASE_URL when configured', async () => {
    process.env.PUBLIC_BASE_URL = 'https://go.example.dev/';
    ddb.on(PutCommand).resolves({});
    const res = await post({ url: 'https://example.com', alias: 'docs' });
    expect(body(res).shortUrl).toBe('https://go.example.dev/docs');
  });
});
