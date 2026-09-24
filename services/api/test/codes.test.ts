import { describe, expect, it } from 'vitest';
import { DEFAULT_CODE_LENGTH, generateCode } from '../src/lib/codes.js';
import { isValidCode } from '../src/lib/validation.js';

describe('generateCode', () => {
  it('produces base62 codes of the default length', () => {
    const code = generateCode();
    expect(code).toHaveLength(DEFAULT_CODE_LENGTH);
    expect(code).toMatch(/^[0-9A-Za-z]+$/);
    expect(isValidCode(code)).toBe(true);
  });

  it('honours a custom length', () => {
    expect(generateCode(12)).toHaveLength(12);
  });

  it('does not repeat across many generations', () => {
    const codes = new Set(Array.from({ length: 10_000 }, () => generateCode()));
    expect(codes.size).toBe(10_000);
  });

  it('uses the whole alphabet roughly uniformly', () => {
    const counts = new Map<string, number>();
    for (const ch of Array.from({ length: 2_000 }, () => generateCode(31)).join('')) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    expect(counts.size).toBe(62);
    const expected = (2_000 * 31) / 62;
    for (const n of counts.values()) {
      expect(Math.abs(n - expected) / expected).toBeLessThan(0.2);
    }
  });
});
