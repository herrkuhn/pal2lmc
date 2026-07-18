// Parses 768-byte Atari .pal files (7800 MARIA / 2600 TIA, 256 entries) into
// Rgb[]. Framework-free by convention: no Angular package imports, no DOM
// types (spec S9.1). Mirrors pal-parser.ts's structure.

import { AtariParseResult, Rgb } from './models';

const ENTRY_COUNT = 256;
const ENTRY_BYTES = 3;
// Exported as the single source of truth for this format's byte
// size, consumed by ConversionService's dispatch-by-size switch (DL-006).
export const ATARI_FILE_SIZE = ENTRY_COUNT * ENTRY_BYTES; // 768
const PAIR_COUNT = ENTRY_COUNT / 2; // 128

function readEntries(bytes: Uint8Array): Rgb[] {
  const entries: Rgb[] = [];
  for (let i = 0; i < ENTRY_COUNT; i++) {
    const offset = i * ENTRY_BYTES;
    entries.push({ r: bytes[offset], g: bytes[offset + 1], b: bytes[offset + 2] });
  }
  return entries;
}

function rgbEquals(a: Rgb, b: Rgb): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

// The TIA ignores the lowest index bit, so official 2600 .pal files carry
// every color twice at adjacent even/odd offsets. duplicatePairsBroken
// feeds the ConversionService a7800/a2600 detection heuristic; it is a
// non-blocking notice input, never a parse error.
function hasDuplicatePairsBroken(entries: Rgb[]): boolean {
  for (let pair = 0; pair < PAIR_COUNT; pair++) {
    if (!rgbEquals(entries[pair * 2], entries[pair * 2 + 1])) {
      return true;
    }
  }
  return false;
}

// Never throws: size is the only validation (no content-based heuristics).
/**
 * Parses a 768-byte Atari .pal file (7800 MARIA or 2600 TIA order) into
 * 256 Rgb entries read straight through -- MARIA byte index equals file
 * index, so this is the only NES/.vpl-sibling parser with no reordering
 * step of its own (atariToLumacodeOrder is identity too).
 *
 * duplicatePairsBroken feeds ConversionService's a7800/a2600 detection
 * heuristic: official 2600 files duplicate every adjacent color pair
 * (TIA ignores the lowest index bit), so all-pairs-duplicate pre-selects
 * a2600 and a broken pair pre-selects a7800, with the mapper being
 * identity either way so misdetection is harmless.
 *
 * @param bytes - Raw file bytes; only 768 is accepted.
 * @returns ok:true with 256 entries and duplicatePairsBroken; ok:false
 *   with reason 'invalid-size' and a human-readable message otherwise.
 */
export function parseAtariPal(bytes: Uint8Array): AtariParseResult {
  if (bytes.length !== ATARI_FILE_SIZE) {
    // Shape matches ParseResult/VplParseResult's ok:false variant (DL-003).
    return {
      ok: false,
      reason: 'invalid-size',
      message: `expected 768 bytes, got ${bytes.length}`,
    };
  }
  const entries = readEntries(bytes);
  return { ok: true, entries, duplicatePairsBroken: hasDuplicatePairsBroken(entries) };
}
