// Parses VICE .vpl text palettes (Commodore color order, 16 entries) into
// Rgb[]. Framework-free by convention: no Angular package imports, no DOM
// types (spec S9.1). Sibling of pal-parser.ts, per spec S9.4.

import { Rgb, VplParseResult } from './models';

const EXPECTED_ENTRY_COUNT = 16;
const HEX_TRIPLE_PATTERN = /^[0-9a-fA-F]{1,2}$/;
const TYPE_LINE_PATTERN = /^#\s*TYPE:(\S+)/i;
const NAME_LINE_PATTERN = /^#\s*NAME:(.+)$/i;

function machineForTag(tag: string): 'c64' | 'vic20' | undefined {
  // VIC is a prefix of VICII, so this must be an exact-token comparison,
  // never a substring match, or every C64 (VICII) file would route to
  // VIC-20.
  const upper = tag.toUpperCase();
  if (upper === 'VICII') return 'c64';
  if (upper === 'VIC') return 'vic20';
  return undefined;
}

/**
 * Parses a VICE .vpl text palette into 16 Commodore-order Rgb entries.
 * Use when a dropped/selected file has a .vpl extension (ConversionService
 * routes there on extension alone).
 *
 * Ignores blank and '#' comment lines except '# TYPE:<tag>' (exact-token
 * match: VICII -> c64, VIC -> vic20; VIC is a prefix of VICII so substring
 * matching would misroute every C64 file) and '# NAME:<display>'.
 * A tagless file returns machine: undefined; ConversionService then
 * defaults to c64 and surfaces a tagAbsent notice.
 *
 * @param text - Full .vpl file contents.
 * @returns ok:true with 16 entries plus optional machine/name and a
 *   ditherIgnored flag for legacy 4th-column files; ok:false with a
 *   human-readable message for a wrong entry count or malformed line.
 *
 * Example:
 *   parseVpl('# TYPE:VICII\n00 00 00\n...') // { ok: true, machine: 'c64', ... }
 */
// Never throws: strict entry count and line-shape validation surface as
// ok:false, mirroring parsePal's discriminated-union contract.
export function parseVpl(text: string): VplParseResult {
  const lines = text.split(/\r\n|\r|\n/);
  let machine: 'c64' | 'vic20' | undefined;
  let name: string | undefined;
  let ditherIgnored = false;
  const entries: Rgb[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    if (line.startsWith('#')) {
      const typeMatch = TYPE_LINE_PATTERN.exec(line);
      if (typeMatch) {
        machine = machineForTag(typeMatch[1]);
        continue;
      }
      const nameMatch = NAME_LINE_PATTERN.exec(line);
      if (nameMatch) {
        name = nameMatch[1].trim();
        continue;
      }
      continue;
    }

    const parts = line.split(/\s+/);
    // Legacy files may carry a 4th dither nibble; VICE itself parses it,
    // warns, and ignores it, so a non-blocking notice is the right shape
    // here too rather than a parse error.
    if (parts.length !== 3 && parts.length !== 4) {
      return { ok: false, reason: 'bad-line', message: `expected "RR GG BB" hex, got "${line}"` };
    }
    const [rHex, gHex, bHex] = parts;
    if (![rHex, gHex, bHex].every((part) => HEX_TRIPLE_PATTERN.test(part))) {
      return { ok: false, reason: 'bad-line', message: `expected "RR GG BB" hex, got "${line}"` };
    }
    if (parts.length === 4) {
      ditherIgnored = true;
    }
    entries.push({ r: parseInt(rHex, 16), g: parseInt(gHex, 16), b: parseInt(bHex, 16) });
  }

  if (entries.length !== EXPECTED_ENTRY_COUNT) {
    // message field aligns this error shape with ParseResult/AtariParseResult (DL-003).
    return {
      ok: false,
      reason: 'wrong-entry-count',
      message: `expected exactly ${EXPECTED_ENTRY_COUNT} data lines, found ${entries.length}`,
    };
  }

  return { ok: true, entries, machine, name, ditherIgnored };
}
