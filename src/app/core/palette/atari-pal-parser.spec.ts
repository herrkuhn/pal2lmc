// Unit tests for parseAtariPal: size validation and the
// all-adjacent-pairs-duplicate heuristic that feeds ConversionService's
// a2600/a7800 pre-selection (duplicatePairsBroken).

import { describe, expect, it } from 'vitest';
import { parseAtariPal } from './atari-pal-parser';

function buildBytes(entryBuilder: (i: number) => [number, number, number]): Uint8Array {
  const bytes = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = entryBuilder(i);
    bytes[i * 3] = r;
    bytes[i * 3 + 1] = g;
    bytes[i * 3 + 2] = b;
  }
  return bytes;
}

describe('parseAtariPal', () => {
  it('parses 768 bytes into 256 entries with correct RGB placement', () => {
    const bytes = buildBytes((i) => [i % 256, (i * 3) % 256, (i * 5) % 256]);

    const result = parseAtariPal(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries).toHaveLength(256);
    for (const index of [0, 1, 128, 255]) {
      expect(result.entries[index]).toEqual({
        r: index % 256,
        g: (index * 3) % 256,
        b: (index * 5) % 256,
      });
    }
  });

  it('reports duplicatePairsBroken false when every adjacent pair matches', () => {
    const bytes = buildBytes((i) => {
      const pair = Math.floor(i / 2);
      return [pair % 256, pair % 256, pair % 256];
    });

    const result = parseAtariPal(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicatePairsBroken).toBe(false);
  });

  it('reports duplicatePairsBroken true when one pair differs', () => {
    const bytes = buildBytes((i) => {
      const pair = Math.floor(i / 2);
      return [pair % 256, pair % 256, pair % 256];
    });
    bytes[3] = 0xff; // break the g byte of entry 1, the second half of pair 0

    const result = parseAtariPal(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicatePairsBroken).toBe(true);
  });

  // Asserts the full { reason; message } shape locally (DL-008);
  // message matches ParseResult/VplParseResult's ok:false shape
  // (DL-003).
  it.each([192, 767, 769, 1536])('rejects an invalid size of %i bytes', (size) => {
    const bytes = new Uint8Array(size);

    const result = parseAtariPal(bytes);

    expect(result).toEqual({
      ok: false,
      reason: 'invalid-size',
      message: `expected 768 bytes, got ${size}`,
    });
  });
});
