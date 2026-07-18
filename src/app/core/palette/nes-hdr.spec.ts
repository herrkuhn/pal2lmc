// Hermetic vitest spec for nes-hdr.ts: base64 fixtures from
// fixtures/pal-fixtures.ts only, never the gitignored corpora.

import { describe, expect, it } from 'vitest';
import {
  detectNesHdrHeadroom,
  linearToSrgb,
  srgbToLinear,
  toNormalizedSdr,
  toRelativeLinear,
} from './nes-hdr';
import { NesPalette, Rgb } from './models';
import {
  decodePalBase64,
  COMPOSITE_DIRECT_FBX_PAL_B64,
  NES_CLASSIC_FBX_PAL_B64,
  PC10_PAL_B64,
  PVM_STYLE_D93_FBX_PAL_B64,
  SMOOTH_FBX_PAL_B64,
  SONY_CXA_PAL_B64,
  WAVEBEAM_PAL_B64,
  NES_HDR_RAW_PAL_B64,
  NES_HDR_SOFT_CLAMP_PAL_B64,
  NES_HDR_MEDIUM_CLAMP_PAL_B64,
  NES_HDR_SONY_DECODER_PAL_B64,
} from './fixtures/pal-fixtures';

// Reassembles a decoded 192-byte .pal buffer into the 64-entry Rgb[]
// shape detectNesHdrHeadroom and friends operate on, mirroring how
// readPaletteFile slices a parsed NES file's base palette (block 0).
function buildPaletteFromBytes(bytes: Uint8Array): NesPalette {
  const palette: Rgb[] = [];
  for (let i = 0; i < 64; i++) {
    palette.push({ r: bytes[3 * i], g: bytes[3 * i + 1], b: bytes[3 * i + 2] });
  }
  return palette;
}

const FBX_ERA_FIXTURES: Array<[string, string]> = [
  ['Composite Direct', COMPOSITE_DIRECT_FBX_PAL_B64],
  ['NES Classic', NES_CLASSIC_FBX_PAL_B64],
  ['PC-10', PC10_PAL_B64],
  ['PVM Style D93', PVM_STYLE_D93_FBX_PAL_B64],
  ['Smooth', SMOOTH_FBX_PAL_B64],
  ['Sony CXA', SONY_CXA_PAL_B64],
  ['Wavebeam', WAVEBEAM_PAL_B64],
];

describe('detectNesHdrHeadroom', () => {
  it.each([
    ['HDR Raw', NES_HDR_RAW_PAL_B64, 162],
    ['Soft Clamp', NES_HDR_SOFT_CLAMP_PAL_B64, 180],
    ['Medium Clamp', NES_HDR_MEDIUM_CLAMP_PAL_B64, 196],
    ['Sony Decoder', NES_HDR_SONY_DECODER_PAL_B64, 189],
  ])('detects %s with whiteLevel %i', (_name, b64, expectedWhite) => {
    const palette = buildPaletteFromBytes(decodePalBase64(b64));
    expect(detectNesHdrHeadroom(palette)).toEqual({ whiteLevel: expectedWhite });
  });

  it.each(FBX_ERA_FIXTURES)('returns null for the FBX-era %s palette', (_name, b64) => {
    const palette = buildPaletteFromBytes(decodePalBase64(b64));
    expect(detectNesHdrHeadroom(palette)).toBeNull();
  });

  it('returns null for the wrong entry count', () => {
    const palette = buildPaletteFromBytes(decodePalBase64(NES_HDR_RAW_PAL_B64)).slice(0, 63);
    expect(detectNesHdrHeadroom(palette)).toBeNull();
  });

  it('returns null for an all-black palette', () => {
    const palette: NesPalette = Array.from({ length: 64 }, () => ({ r: 0, g: 0, b: 0 }));
    expect(detectNesHdrHeadroom(palette)).toBeNull();
  });

  it('returns null for a flat mid-gray palette (peak below the saturation floor)', () => {
    const palette: NesPalette = Array.from({ length: 64 }, () => ({ r: 0x80, g: 0x80, b: 0x80 }));
    expect(detectNesHdrHeadroom(palette)).toBeNull();
  });

  it('returns null when $20 and $30 are both zero (garbage reference white, not headroom)', () => {
    const palette: NesPalette = Array.from({ length: 64 }, () => ({ r: 0xff, g: 0xff, b: 0xff }));
    palette[0x20] = { r: 0, g: 0, b: 0 };
    palette[0x30] = { r: 0, g: 0, b: 0 };
    expect(detectNesHdrHeadroom(palette)).toBeNull();
  });
});

describe('srgbToLinear / linearToSrgb', () => {
  it('round-trips within 1e-6 including values above 1', () => {
    for (const x of [0, 0.001, 0.04045, 0.5, 1, 1.5574, 2.7677]) {
      expect(linearToSrgb(srgbToLinear(x))).toBeCloseTo(x, 6);
    }
  });
});

describe('toRelativeLinear (HDR Raw)', () => {
  const palette = buildPaletteFromBytes(decodePalBase64(NES_HDR_RAW_PAL_B64));
  const detection = detectNesHdrHeadroom(palette)!;

  it('maps $20 to 1.0 within epsilon', () => {
    const relative = toRelativeLinear(palette, detection.whiteLevel);
    expect(relative[0x20].r).toBeCloseTo(1, 3);
    expect(relative[0x20].g).toBeCloseTo(1, 3);
    expect(relative[0x20].b).toBeCloseTo(1, 3);
  });

  it('maps $22 blue to about 2.77 linear', () => {
    const relative = toRelativeLinear(palette, detection.whiteLevel);
    expect(relative[0x22].b).toBeCloseTo(2.7677, 3);
  });
});

describe('toNormalizedSdr (HDR Raw)', () => {
  const palette = buildPaletteFromBytes(decodePalBase64(NES_HDR_RAW_PAL_B64));
  const detection = detectNesHdrHeadroom(palette)!;
  const result = toNormalizedSdr(palette, detection.whiteLevel);

  it('maps white ($20) to 255 and flags it unclipped', () => {
    expect(result.entries[0x20]).toEqual({ r: 255, g: 255, b: 255 });
    expect(result.clipped[0x20]).toBe(false);
  });

  it('flags exactly the entries whose linear value exceeds 1.0 as clipped', () => {
    expect(result.clipped[0x22]).toBe(true);
    expect(result.entries[0x22].b).toBe(255);
    expect(result.clipped.filter(Boolean).length).toBe(17);
  });

  it('monotonicity spot-check: a byte-darker non-clipped source channel normalizes darker', () => {
    // $0F (black) is darker than $00 (dark grey) in the HDR Raw fixture
    // and neither clips, so their normalized order matches source order.
    expect(result.entries[0x0f].r).toBeLessThanOrEqual(result.entries[0x00].r);
  });
});
