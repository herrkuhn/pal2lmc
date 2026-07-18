// Parses raw NES .pal file bytes into a NesPalette. Framework-free by
// convention: no Angular package imports, no DOM types (spec S9.1).

import { NesPalette, ParseResult, Rgb } from './models';

const ENTRY_COUNT = 64;
const ENTRY_BYTES = 3;
// Exported as the single source of truth for this format's byte
// sizes, consumed by ConversionService's dispatch-by-size switch --
// one definition per format size (DL-006).
export const NES_SINGLE_FILE_SIZE = ENTRY_COUNT * ENTRY_BYTES; // 192
const EMPHASIS_BLOCK_COUNT = 8;
export const NES_EMPHASIS_FILE_SIZE = NES_SINGLE_FILE_SIZE * EMPHASIS_BLOCK_COUNT; // 1536

function readPalette(bytes: Uint8Array): NesPalette {
  const palette: Rgb[] = [];
  for (let i = 0; i < ENTRY_COUNT; i++) {
    const offset = i * ENTRY_BYTES;
    palette.push({ r: bytes[offset], g: bytes[offset + 1], b: bytes[offset + 2] });
  }
  return palette;
}

/**
 * Parses raw NES .pal file bytes into 64 PPU-order Rgb entries.
 *
 * @param bytes - Raw file bytes; 192 or 1536 is accepted.
 * @returns ok:true with entries and emphasisIgnored; ok:false with
 *   reason 'invalid-size' and a human-readable message otherwise (same
 *   { reason; message } shape as VplParseResult/AtariParseResult, DL-003).
 */
// Never throws: size is the only validation (no content-based heuristics).
// 1536-byte inputs are 8 emphasis blocks; only block 0 (the first 192 bytes)
// is read, since NES color-emphasis conversion is out of scope.
export function parsePal(bytes: Uint8Array): ParseResult {
  if (bytes.length === NES_SINGLE_FILE_SIZE) {
    return { ok: true, entries: readPalette(bytes), emphasisIgnored: false };
  }
  if (bytes.length === NES_EMPHASIS_FILE_SIZE) {
    return {
      ok: true,
      entries: readPalette(bytes.subarray(0, NES_SINGLE_FILE_SIZE)),
      emphasisIgnored: true,
    };
  }
  return {
    ok: false,
    reason: 'invalid-size',
    message: `expected 192 or 1536 bytes, got ${bytes.length}`,
  };
}
