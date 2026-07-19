// Section 4 mapping: NES PPU-order palette -> LumaCode index order.
// Framework-free by convention: no Angular package imports, no DOM types.

import { NesPalette, Rgb } from './models';

const RESERVED_COUNT = 8;
const ROWS = 4;
const HUES_PER_ROW = 14;
const PAL_ROW_STRIDE = 16;

export function toLumacodeOrder(palette: NesPalette): Rgb[] {
  const out: Rgb[] = [];

  for (let i = 0; i < RESERVED_COUNT; i++) {
    out.push({ r: 0, g: 0, b: 0 });
  }

  for (let row = 0; row < ROWS; row++) {
    for (let hue = 0; hue < HUES_PER_ROW; hue++) {
      const source = palette[row * PAL_ROW_STRIDE + hue];
      out.push({ r: source.r, g: source.g, b: source.b });
    }
  }

  return out;
}
