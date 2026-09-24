import { generateCode } from '../lib/codes.js';
import { withErrorHandling } from '../lib/handler.js';
import { HttpError, json, parseJsonBody, publicBaseUrl } from '../lib/http.js';
import { logger } from '../lib/logger.js';
import { putLinkIfAbsent, type Link } from '../lib/repository.js';
import { createLinkSchema } from '../lib/validation.js';

const MAX_GENERATION_ATTEMPTS = 5;
const SECONDS_PER_DAY = 86_400;

/** POST /api/links — { url, alias?, ttlDays? } -> 201 { code, shortUrl, ... } */
export const handler = withErrorHandling('createLink', async (event) => {
  const input = createLinkSchema.parse(parseJsonBody(event));
  const baseUrl = publicBaseUrl(event);

  if (new URL(input.url).host === new URL(baseUrl).host) {
    throw new HttpError(400, 'Cannot shorten a link that points to this service');
  }

  const now = new Date();
  const base: Omit<Link, 'code'> = {
    url: input.url,
    createdAt: now.toISOString(),
    clicks: 0,
    custom: input.alias !== undefined,
    expiresAt: input.ttlDays
      ? Math.floor(now.getTime() / 1000) + input.ttlDays * SECONDS_PER_DAY
      : undefined,
  };

  const link = input.alias
    ? await createWithAlias(input.alias, base)
    : await createWithRandomCode(base);

  logger.info('link created', { code: link.code, custom: link.custom });
  return json(
    201,
    {
      code: link.code,
      shortUrl: `${baseUrl}/${link.code}`,
      url: link.url,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt ? new Date(link.expiresAt * 1000).toISOString() : null,
    },
    { location: `/api/links/${link.code}` },
  );
});

async function createWithAlias(alias: string, base: Omit<Link, 'code'>): Promise<Link> {
  const link = { ...base, code: alias };
  if (!(await putLinkIfAbsent(link))) {
    throw new HttpError(409, `Alias "${alias}" is already taken`);
  }
  return link;
}

async function createWithRandomCode(base: Omit<Link, 'code'>): Promise<Link> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const link = { ...base, code: generateCode() };
    if (await putLinkIfAbsent(link)) return link;
    logger.warn('code collision, retrying', { attempt });
  }
  throw new Error(`Could not generate a unique code after ${MAX_GENERATION_ATTEMPTS} attempts`);
}
