import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Largest multiple of the alphabet size that fits in a byte. Bytes at or above
// this value are rejected so every character is equally likely (no modulo bias).
const UNBIASED_LIMIT = 256 - (256 % ALPHABET.length);

export const DEFAULT_CODE_LENGTH = 7;

/**
 * Generates a cryptographically random base62 code.
 * 7 chars = 62^7 ≈ 3.5 trillion combinations, so collisions are rare and are
 * handled by a conditional write + retry in the create handler.
 */
export function generateCode(length = DEFAULT_CODE_LENGTH): string {
  let code = '';
  while (code.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < UNBIASED_LIMIT) {
        code += ALPHABET[byte % ALPHABET.length];
        if (code.length === length) break;
      }
    }
  }
  return code;
}
