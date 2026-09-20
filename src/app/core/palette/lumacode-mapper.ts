// Section 4 mapping: NES PPU-order palette -> LumaCode index order.
// Framework-free by convention: no Angular package imports, no DOM types.
// Two output positions are fixed regardless of source: raw 0..7 (reserved
// PPUdigitizer emphasis commands) and raw 35 (the folded $1D/$xE/$xF word).

import { NesPalette, Rgb } from './models';

const RESERVED_COUNT = 8;
const ROWS = 4;
const HUES_PER_ROW = 14;
const PAL_ROW_STRIDE = 16;

// Row 1, hue 13 ($1D): the PPUdigitizer folds $1D and every $xE/$xF into
// this raw word, so the RT4K renders it as $0F, the black most games
// use -- the entry is black regardless of the source palette's $1D.
const FOLDED_BLACK_INDEX = RESERVED_COUNT + 1 * HUES_PER_ROW + 13;

/**
 * Reorders 64 NES PPU-order Rgb entries into LumaCode order. Raw 0-7 are
 * hardcoded black (the reserved PPUdigitizer emphasis commands) and raw 35
 * is hardcoded black (the folded $1D/$xE/$xF word); every other entry is
 * the source palette value at the matching row/hue position.
 *
 * @param palette - Exactly 64 entries in NES PPU order ($00-$3F).
 * @returns 64 fresh entries in LumaCode order; input is left unmodified.
 */
export function toLumacodeOrder(palette: NesPalette): Rgb[] {
  const out: Rgb[] = [];

  for (let i = 0; i < RESERVED_COUNT; i++) {
    out.push({ r: 0, g: 0, b: 0 });
  }

  for (let row = 0; row < ROWS; row++) {
    for (let hue = 0; hue < HUES_PER_ROW; hue++) {
      const index = RESERVED_COUNT + row * HUES_PER_ROW + hue;
      const source = palette[row * PAL_ROW_STRIDE + hue];
      out.push(index === FOLDED_BLACK_INDEX ? { r: 0, g: 0, b: 0 } : { r: source.r, g: source.g, b: source.b });
    }
  }

  return out;
}
