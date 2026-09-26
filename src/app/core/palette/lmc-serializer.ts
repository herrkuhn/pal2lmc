import { LmcOptions, Rgb } from './models';
import { headerFor, presetNameFor, SYSTEMS, SystemId, TvNorm } from './system';

const ENTRIES_PER_LINE = 16;

// hexCase comes from SYSTEMS[system] -- uppercase only for a2600, the
// sole official preset (TIA_2600.lmc) that uses it.
function toHexEntry(rgb: Rgb, hexCase: 'lower' | 'upper'): string {
  const hex = (n: number) => {
    const digits = n.toString(16).padStart(2, '0');
    return hexCase === 'upper' ? digits.toUpperCase() : digits;
  };
  return `${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultCommentBody(opts: LmcOptions, system: SystemId, tvNorm: TvNorm): string[] {
  return [
    `RetroTINK LumaCode preset: ${presetNameFor(system, tvNorm)} -- ${opts.paletteName}`,
    'First line = ADC sample rate and decimation, applied when loaded.',
    `Converted from ${opts.sourceFileName} on ${isoDate()}.`,
  ];
}

function normalizeCommentLine(line: string): string {
  const ascii = line.replace(/[^\x00-\x7F]/g, '');
  const stripped = ascii.replace(/^#+\s*/, '');
  return stripped.length > 0 ? `# ${stripped}` : '';
}

function buildCommentBlock(opts: LmcOptions, system: SystemId, tvNorm: TvNorm): string {
  const rawLines =
    opts.comment !== undefined ? opts.comment.split('\n') : defaultCommentBody(opts, system, tvNorm);
  return rawLines
    .map(normalizeCommentLine)
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Serializes LumaCode-ordered entries plus options into the .lmc text
 * format. The sole producer of .lmc output; call after a mapper
 * (toLumacodeOrder / commodoreToLumacodeOrder / atariToLumacodeOrder).
 *
 * opts.system and opts.tvNorm default to nes/pal when absent.
 * Comment-block wording, hex case, anchor, protocol tokens, syncw, and
 * wofs are resolved from the SYSTEMS row for the effective system/norm.
 * The header line is `rate dec anchor=N` plus the system's protocol
 * tokens (e.g. `nes=1`) plus `syncw=N wofs=M`, single-space separated.
 * Chunking into ENTRIES_PER_LINE-wide lines is entry-count agnostic, so
 * it serves 16/64/256-entry palettes unchanged.
 *
 * @param entries - LumaCode-ordered color entries.
 * @param opts - Header (sampleRate/decimation), comment, and per-system
 * options; anchor, protocol tokens, syncw, and wofs are not opts fields,
 * they come from SYSTEMS for the effective system/norm.
 * @returns Full .lmc file text, always ending in exactly one newline.
 */
export function serializeLmc(entries: Rgb[], opts: LmcOptions): string {
  // Optional fields default to nes/pal when an LmcOptions literal (e.g. in
  // golden.spec.ts) omits system/tvNorm.
  const system = opts.system ?? 'nes';
  const tvNorm = opts.tvNorm ?? 'pal';
  const hexCase = SYSTEMS[system].hexCase;
  const commentBlock = buildCommentBlock(opts, system, tvNorm);
  // anchor, syncw, and wofs are per-system facts, not LmcOptions fields, so
  // a hand-edited sampleRate/decimation still ships the system's measured
  // tokens; every official per-system preset spells every one of them
  // explicitly (including anchor=0 and a negative wofs), so none is ever
  // omitted here either.
  const { anchor, syncw, wofs } = headerFor(system, tvNorm);
  // Token order matches every official preset exactly: rate, dec, anchor=,
  // any protocol tokens, then syncw=, wofs=. Whether the RT4K parser
  // tolerates a different order is unverified, so this order is pinned
  // against the official files' bytes rather than any assumption about
  // parser leniency. syncw and wofs come from headerFor, not opts or
  // protocolTokens: they are per-system numeric facts like anchor, so a
  // hand-edited sampleRate/decimation still emits them, and the numeric
  // type lets the samplingHint text and README table read the same
  // values serializeLmc emits.
  const header = [
    opts.sampleRate,
    opts.decimation,
    `anchor=${anchor}`,
    ...SYSTEMS[system].protocolTokens,
    `syncw=${syncw}`,
    `wofs=${wofs}`,
  ].join(' ');
  const dataLines: string[] = [];
  for (let i = 0; i < entries.length; i += ENTRIES_PER_LINE) {
    dataLines.push(
      entries
        .slice(i, i + ENTRIES_PER_LINE)
        .map((entry) => toHexEntry(entry, hexCase))
        .join(','),
    );
  }
  const blocks = [commentBlock, header, dataLines.join('\n')].filter((b) => b.length > 0);
  return `${blocks.join('\n\n')}\n`;
}
