// Unit tests for commodoreToLumacodeOrder: verifies the fixed
// COMMODORE_TO_LUMACODE permutation slot-by-slot with distinct sentinel
// colors and confirms the mapper returns fresh entries rather than
// aliasing its input.

import { describe, expect, it } from 'vitest';
import { COMMODORE_TO_LUMACODE, commodoreToLumacodeOrder } from './commodore-mapper';
import { Rgb } from './models';

function buildSentinelEntries(): Rgb[] {
  return Array.from({ length: 16 }, (_, i) => ({ r: i, g: 0x10 + i, b: 0x20 + i }));
}

describe('commodoreToLumacodeOrder', () => {
  it('returns exactly 16 entries', () => {
    const out = commodoreToLumacodeOrder(buildSentinelEntries());
    expect(out).toHaveLength(16);
  });

  it('places output slot i from input slot COMMODORE_TO_LUMACODE[i]', () => {
    const entries = buildSentinelEntries();

    const out = commodoreToLumacodeOrder(entries);

    for (let i = 0; i < 16; i++) {
      expect(out[i]).toEqual(entries[COMMODORE_TO_LUMACODE[i]]);
    }
  });

  it('returns fresh Rgb objects (mutating output leaves input untouched)', () => {
    const entries = buildSentinelEntries();

    const out = commodoreToLumacodeOrder(entries);
    out[0].r = 0xff;

    expect(entries[0].r).not.toBe(0xff);
  });
});
