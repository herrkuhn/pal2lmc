// Section 4 mapping: NES PPU-order palette -> LumaCode index order.
// Framework-free by convention: no Angular package imports, no DOM types.

import { NesPalette, Rgb } from './models';

const RESERVED_COUNT = 8;
const ROWS = 4;
const HUES_PER_ROW = 14;
const PAL_ROW_STRIDE = 16;
const VISIBILITY_INDEX = 21; // 8 + 14*0 + 13, NES color $0D
const VISIBILITY_COLOR: Rgb = { r: 0x30, g: 0x30, b: 0x30 };

export function toLumacodeOrder(palette: NesPalette, color0d: 'strict' | 'visible'): Rgb[] {
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

  if (color0d === 'visible') {
    out[VISIBILITY_INDEX] = { ...VISIBILITY_COLOR };
  }

  return out;
}
