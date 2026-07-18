// Unit tests for atariToLumacodeOrder: confirms the identity
// mapping (MARIA/TIA byte index already matches LumaCode order) and that
// output entries are fresh copies, not aliases of the input.

import { describe, expect, it } from 'vitest';
import { atariToLumacodeOrder } from './atari-mapper';
import { Rgb } from './models';

function buildSentinelEntries(): Rgb[] {
  return Array.from({ length: 256 }, (_, i) => ({ r: i % 256, g: (255 - i) % 256, b: i % 16 }));
}

describe('atariToLumacodeOrder', () => {
  it('returns output equal to input element-wise for 256 sentinel entries', () => {
    const entries = buildSentinelEntries();

    const out = atariToLumacodeOrder(entries);

    expect(out).toEqual(entries);
  });

  it('returns fresh Rgb objects, not the same references', () => {
    const entries = buildSentinelEntries();

    const out = atariToLumacodeOrder(entries);
    out[0].r = 0xff;

    expect(entries[0].r).not.toBe(0xff);
  });
});
