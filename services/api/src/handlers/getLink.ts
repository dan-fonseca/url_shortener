import { withErrorHandling } from '../lib/handler.js';
import { HttpError, json, publicBaseUrl } from '../lib/http.js';
import { getLink } from '../lib/repository.js';
import { isValidCode } from '../lib/validation.js';

/** GET /api/links/{code} -> link metadata and click stats. */
export const handler = withErrorHandling('getLink', async (event) => {
  const code = event.pathParameters?.code;
  if (!isValidCode(code)) throw new HttpError(404, 'Link not found');

  const link = await getLink(code);
  if (!link) throw new HttpError(404, 'Link not found');

  return json(200, {
    code: link.code,
    shortUrl: `${publicBaseUrl(event)}/${link.code}`,
    url: link.url,
    clicks: link.clicks,
    createdAt: link.createdAt,
    lastClickedAt: link.lastClickedAt ?? null,
    expiresAt: link.expiresAt ? new Date(link.expiresAt * 1000).toISOString() : null,
    custom: link.custom,
  });
});
