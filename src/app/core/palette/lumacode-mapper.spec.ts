import { describe, expect, it } from 'vitest';
import { toLumacodeOrder } from './lumacode-mapper';
import { NesPalette, Rgb } from './models';
import { decodePalBase64, NES_CLASSIC_FBX_PAL_B64 } from './fixtures/pal-fixtures';

function buildSyntheticPalette(): NesPalette {
  const palette: Rgb[] = [];
  for (let v = 0; v < 64; v++) {
    palette.push({ r: v, g: 0x40 + v, b: 0x80 + v });
  }
  return palette;
}

function buildPaletteFromBytes(bytes: Uint8Array): NesPalette {
  const palette: Rgb[] = [];
  for (let i = 0; i < 64; i++) {
    palette.push({ r: bytes[3 * i], g: bytes[3 * i + 1], b: bytes[3 * i + 2] });
  }
  return palette;
}

describe('toLumacodeOrder', () => {
  it('maps every row/hue via the index formula and never surfaces $xE/$xF columns', () => {
    const palette = buildSyntheticPalette();
    const out = toLumacodeOrder(palette);

    for (let row = 0; row < 4; row++) {
      for (let hue = 0; hue < 14; hue++) {
        expect(out[8 + 14 * row + hue]).toEqual(palette[row * 16 + hue]);
      }
    }

    const dropped: Rgb[] = [];
    for (let row = 0; row < 4; row++) {
      dropped.push(palette[row * 16 + 14], palette[row * 16 + 15]);
    }
    const tail = out.slice(8);
    for (const droppedColor of dropped) {
      expect(tail).not.toContainEqual(droppedColor);
    }
  });

  it('hardcodes indices 0..7 to black', () => {
    const palette = buildSyntheticPalette();
    const out = toLumacodeOrder(palette);
    for (let i = 0; i < 8; i++) {
      expect(out[i]).toEqual({ r: 0, g: 0, b: 0 });
    }
  });

  it('does not mutate the input palette', () => {
    const palette = buildSyntheticPalette();
    const original = palette.map((c) => ({ ...c }));

    toLumacodeOrder(palette);

    expect(palette).toEqual(original);
  });

  it('matches FBX anchor values from the real NES Classic fixture', () => {
    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    const palette = buildPaletteFromBytes(bytes);

    const out = toLumacodeOrder(palette);

    expect(out[8]).toEqual({ r: 0x61, g: 0x61, b: 0x61 });
    expect(out[21]).toEqual({ r: 0, g: 0, b: 0 });
    expect(out[22]).toEqual({ r: 0xaa, g: 0xaa, b: 0xaa });
    expect(out[36]).toEqual({ r: 0xfc, g: 0xfc, b: 0xfc });
    expect(out[50]).toEqual({ r: 0xfc, g: 0xfc, b: 0xfc });
    expect(out[63]).toEqual({ r: 0xac, g: 0xac, b: 0xac });
  });
});
