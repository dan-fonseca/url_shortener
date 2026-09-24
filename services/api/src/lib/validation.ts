import { z } from 'zod';

/** Codes and aliases share one namespace: URL-safe, no dots (dots are reserved for static files). */
export const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

/** First path segments that belong to the app itself and must never become short codes. */
const RESERVED = new Set(['api', 'app', 'assets', 'health', 'admin', 'static', 'favicon']);

export const MAX_URL_LENGTH = 2048;
export const MAX_TTL_DAYS = 365;

export const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
    .url('Must be a valid absolute URL')
    // Zod runs refinements even after .url() fails, so parsing must not throw here.
    .refine((value) => {
      const protocol = URL.canParse(value) ? new URL(value).protocol : null;
      return protocol === 'http:' || protocol === 'https:';
    }, 'Only http and https URLs are allowed'),
  alias: z
    .string()
    .regex(CODE_PATTERN, 'Alias must be 3-32 characters: letters, digits, "-" or "_"')
    .refine((value) => !RESERVED.has(value.toLowerCase()), 'This alias is reserved')
    .optional(),
  ttlDays: z.number().int().min(1).max(MAX_TTL_DAYS).optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

export function isValidCode(code: string | undefined): code is string {
  return code !== undefined && CODE_PATTERN.test(code);
}
