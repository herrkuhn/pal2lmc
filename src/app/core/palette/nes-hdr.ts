// NES HDR-headroom palette detection and brightness reconstruction.
// Framework-free by convention: no Angular imports, no DOM/WebGPU types
// (spec S9.1). Sibling module to lumacode-mapper.ts; a future non-NES
// headroom convention gets its own sibling pure function here, not a
// strategy-pattern abstraction (spec S9.4).

import { NesPalette, Rgb } from './models';

// Corpus evidence (prelim-plan-hdr-palettes.md sec.2 table): the four
// rt4k_nes_hdr_v2 variants measure white/peak ratios 0.635-0.769, while
// every FBX-era preset measures 1.0. 0.85 clears the highest HDR ratio
// (0.769, Medium Clamp) by 0.081 and sits 0.15 below the FBX-era floor.
const HEADROOM_RATIO_MAX = 0.85;

// Every vendored preset -- all four HDR variants and every FBX-era
// palette -- peaks at exactly 255, since the scaling convention puts the
// hottest color $22 at full scale. 240 is 255 minus ~6% slack for
// rounded or rescaled exports; it also guards flat/dim palettes and
// division by zero.
const SATURATION_FLOOR = 240;

const ENTRY_COUNT = 64;
const REFERENCE_WHITE_INDICES = [0x20, 0x30] as const;

/**
 * Detection result: whiteLevel is the reference-white byte value this
 * palette encodes brightness relative to, anchoring toRelativeLinear and
 * toNormalizedSdr's reconstruction against the palette's own white point
 * rather than its peak byte value.
 */
export interface NesHdrDetection {
  whiteLevel: number;
}

function maxChannel(entry: Rgb): number {
  return Math.max(entry.r, entry.g, entry.b);
}

function peakChannel(palette: NesPalette): number {
  let peak = 0;
  for (const entry of palette) {
    peak = Math.max(peak, maxChannel(entry));
  }
  return peak;
}

/**
 * Detects the RT4K NES HDR-headroom scaling convention: plain 8-bit sRGB
 * files with no marker, where reference white ($20/$30) sits below the
 * hottest illegal color ($22) rather than at peak brightness.
 *
 * The peak channel across all 64 entries must reach SATURATION_FLOOR
 * (240 -- 255 minus about 6% slack for rounded or rescaled exports,
 * since every vendored preset, HDR and FBX-era alike, peaks at exactly
 * 255): below that a palette is too flat or dim to carry a meaningful
 * ratio, and the floor also keeps the white/peak division below from a
 * zero denominator. Reference white is the max of indices $20 AND $30,
 * not either alone, so a palette with only one tinted reference-white
 * entry cannot skew the ratio; a white reading of 0 is rejected as a
 * garbage reference point, not headroom.
 *
 * @param palette - Source (PPU) order entries.
 * @returns { whiteLevel } when detected, null otherwise.
 */
// Detection is NES-only: only the NES defines reference-white indices
// ($20/$30) to anchor a white/peak ratio; a future non-NES headroom
// convention is a sibling pure function, not a strategy pattern (S9.4).
export function detectNesHdrHeadroom(palette: NesPalette): NesHdrDetection | null {
  if (palette.length !== ENTRY_COUNT) return null;

  const peak = peakChannel(palette);
  if (peak < SATURATION_FLOOR) return null;

  // Max of $20 AND $30 resists a palette where one reference white is
  // tinted.
  const white = Math.max(...REFERENCE_WHITE_INDICES.map((i) => maxChannel(palette[i])));
  if (white === 0) return null; // a black reference white is garbage, not headroom

  if (white / peak <= HEADROOM_RATIO_MAX) {
    return { whiteLevel: white };
  }
  return null;
}

/** Linear-light RGB triple. Components are unbounded above 1.0: headroom
 *  content brighter than the detected reference white encodes as values
 *  greater than 1.0 rather than clipping. */
interface LinearRgb {
  r: number;
  g: number;
  b: number;
}

/**
 * Reconstructs relative linear brightness for every channel, anchored to
 * the detected reference white rather than peak brightness. Values may
 * exceed 1.0 (HDR Raw's $22 blue reaches about 2.77).
 *
 * @param palette - Source (PPU) order entries.
 * @param whiteLevel - The detected reference-white byte value.
 * @returns Source-order linear RGB triples.
 */
export function toRelativeLinear(palette: NesPalette, whiteLevel: number): LinearRgb[] {
  const whiteLinear = srgbToLinear(whiteLevel / 255);
  return palette.map((entry) => ({
    r: srgbToLinear(entry.r / 255) / whiteLinear,
    g: srgbToLinear(entry.g / 255) / whiteLinear,
    b: srgbToLinear(entry.b / 255) / whiteLinear,
  }));
}

/**
 * Normalizes a headroom palette for SDR preview: white maps to 255, and
 * anything brighter clips at 1.0 linear rather than overflowing.
 *
 * @param palette - Source (PPU) order entries.
 * @param whiteLevel - The detected reference-white byte value.
 * @returns Source-order Rgb entries plus a per-entry clipped flag (true
 *   iff any channel exceeded 1.0 linear before clipping).
 */
export function toNormalizedSdr(
  palette: NesPalette,
  whiteLevel: number,
): { entries: Rgb[]; clipped: boolean[] } {
  const relative = toRelativeLinear(palette, whiteLevel);
  const entries: Rgb[] = [];
  const clipped: boolean[] = [];

  for (const linear of relative) {
    // Per-entry, not per-channel: the preview marks a whole swatch as
    // clipped rather than tracking which channel individually exceeded
    // reference white.
    clipped.push(linear.r > 1 || linear.g > 1 || linear.b > 1);
    entries.push({
      r: Math.round(linearToSrgb(Math.min(linear.r, 1)) * 255),
      g: Math.round(linearToSrgb(Math.min(linear.g, 1)) * 255),
      b: Math.round(linearToSrgb(Math.min(linear.b, 1)) * 255),
    });
  }

  return { entries, clipped };
}

// Standard sRGB piecewise transfer pair, extended beyond 1.0 by
// continuing the power segment rather than clamping -- HDR headroom
// values (e.g. HDR Raw's $22 blue) exceed 1.0 and must round-trip for
// both the SDR-normalized fallback above and ConversionService's
// hdrPreviewColors passthrough (HDR plan DL-005).
/**
 * @param encoded - sRGB-encoded value, nominally 0-1 but unclamped above
 *   1.0 for headroom content.
 * @returns Linear-light value in the same unbounded range.
 */
export function srgbToLinear(encoded: number): number {
  return encoded <= 0.04045 ? encoded / 12.92 : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

/** Inverse of srgbToLinear; round-trips exactly, including inputs > 1.0. */
export function linearToSrgb(linear: number): number {
  return linear <= 0.0031308 ? linear * 12.92 : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}
