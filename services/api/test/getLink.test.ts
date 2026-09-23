import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from '../src/handlers/getLink.js';
import { body, context, makeEvent } from './helpers.js';

const ddb = mockClient(DynamoDBDocumentClient);

const get = (code: string) =>
  handler(makeEvent({ rawPath: `/api/links/${code}`, pathParameters: { code } }), context);

describe('GET /api/links/{code}', () => {
  beforeEach(() => {
    ddb.reset();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns link stats', async () => {
    ddb.on(GetCommand).resolves({
      Item: {
        code: 'abc1234',
        url: 'https://example.com',
        clicks: 42,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastClickedAt: '2026-01-02T00:00:00.000Z',
        custom: false,
      },
    });

    const res = await get('abc1234');

    expect(res.statusCode).toBe(200);
    expect(body(res)).toMatchObject({
      code: 'abc1234',
      shortUrl: 'https://sho.rt/abc1234',
      clicks: 42,
      expiresAt: null,
    });
  });

  it('formats expiry as ISO-8601', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    ddb.on(GetCommand).resolves({
      Item: {
        code: 'abc1234',
        url: 'https://example.com',
        clicks: 0,
        createdAt: 'x',
        expiresAt,
        custom: false,
      },
    });

    const res = await get('abc1234');

    expect(body(res).expiresAt).toBe(new Date(expiresAt * 1000).toISOString());
    expect(body(res).lastClickedAt).toBeNull();
  });

  it('treats expired-but-not-yet-purged links as missing', async () => {
    ddb.on(GetCommand).resolves({
      Item: {
        code: 'old1234',
        url: 'https://example.com',
        clicks: 3,
        createdAt: 'x',
        expiresAt: 1,
        custom: false,
      },
    });
    expect((await get('old1234')).statusCode).toBe(404);
  });

  it('returns 404 for unknown codes', async () => {
    ddb.on(GetCommand).resolves({});
    expect((await get('nope123')).statusCode).toBe(404);
  });

  it('returns 404 for malformed codes', async () => {
    expect((await get('x')).statusCode).toBe(404);
    expect(ddb.commandCalls(GetCommand)).toHaveLength(0);
  });
});
