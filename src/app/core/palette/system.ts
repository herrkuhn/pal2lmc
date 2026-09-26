// Per-system facts for the .pal/.vpl -> .lmc conversion core. Framework-free
// by convention: no Angular package imports, no DOM types (spec S9.1).
// This is the single source of per-system knowledge: header defaults, hex
// case, entry count, preset comment wording, and the advanced-panel sampling
// hint. Header defaults include the per-system word-phase anchor, the sync
// width and word-offset pair (syncw, wofs), and any protocol tokens (e.g.
// NES's nes=1) serializeLmc appends to the header line. serializeLmc,
// defaultOptionsFor, and the options-form UI all read the same SYSTEMS row
// rather than threading these facts as ad-hoc parameters.

import type { LmcOptions } from './models';

export type SystemId = 'nes' | 'c64' | 'vic20' | 'a7800' | 'a2600';
// Meaningful for c64/vic20 only -- NES and the two Atari systems carry one
// preset each, so their header/presetName rows are not norm-keyed.
export type TvNorm = 'pal' | 'ntsc';

export interface HeaderDefaults {
  // Every field below always appears on the header line; a zero anchor or
  // a negative word offset is written out rather than treated as an
  // implicit default, because the header line must match the official
  // preset text byte for byte. syncw and wofs are numeric fields here,
  // not protocolTokens strings, because serializeLmc, the samplingHint
  // text, and the README header table all consume the numbers directly;
  // protocolTokens stays reserved for flag-like tokens such as NES's
  // nes=1. They stay out of LmcOptions for the same reason anchor does:
  // a per-system measured constant, not a user-editable value.
  rate: number;
  dec: number;
  // Word-phase constant measured per system on the reference generator,
  // norm-keyed only where the measurement itself differs (the VIC-20).
  anchor: number;
  // Sync width and word start relative to the sync, both measured on
  // c0pperdragon's LumaCode reference generator; the RetroTINK uses them to
  // align words automatically each time it locks, falling back to anchor
  // when that measurement fails. Norm-keyed only where the measurement
  // itself differs (the C64's syncw, the VIC-20's wofs).
  syncw: number;
  wofs: number;
}

export interface SystemRow {
  id: SystemId;
  displayName: string;
  // A plain string for single-preset systems; a { pal, ntsc } pair for the
  // two Commodore systems, whose official comment header carries a norm
  // slot (e.g. "Commodore 64 / C128 (PAL)").
  presetName: string | { pal: string; ntsc: string };
  header: HeaderDefaults | { pal: HeaderDefaults; ntsc: HeaderDefaults };
  hexCase: 'lower' | 'upper';
  entryCount: 16 | 64 | 256;
  samplingHint: string;
  // Tokens appended after anchor=N on the header line, e.g. ['nes=1'] for
  // nes -- the NES protocol flag that makes 1.82.0+ articles render the
  // PPU emphasis words 0..7 as a colour tint (older articles ignore it).
  // Every other system emits no protocol tokens.
  protocolTokens: readonly string[];
}

// Single authoritative row per system: header defaults per TV norm (rate,
// decimation, the measured anchor, and the syncw/wofs pair), hex case,
// entry count, preset comment wording, protocol tokens appended after the
// anchor, and the advanced-panel sampling hint. Norm affects only the
// header fields -- rate, decimation, the VIC-20's anchor, the C64's syncw,
// and the VIC-20's wofs -- and comment text, never color data.
export const SYSTEMS: Record<SystemId, SystemRow> = {
  nes: {
    id: 'nes',
    displayName: 'NES / Famicom',
    presetName: 'NES / Famicom',
    header: { rate: 4092, dec: 4, anchor: 1, syncw: 300, wofs: 10 },
    hexCase: 'lower',
    entryCount: 64,
    samplingHint:
      'The NES draws 341 dots per scanline and lumacode carries 3 samples per pixel, ' +
      'oversampled 4x = 4092. Every official NES preset uses 4092 / 4. The header also ' +
      'carries anchor=1 nes=1 syncw=300 wofs=10, per-system constants.',
    protocolTokens: ['nes=1'],
  },
  c64: {
    id: 'c64',
    displayName: 'Commodore 64 / C128',
    presetName: { pal: 'Commodore 64 / C128 (PAL)', ntsc: 'Commodore 64 / C128 (NTSC)' },
    header: {
      pal: { rate: 4032, dec: 4, anchor: 1, syncw: 296, wofs: -2 },
      ntsc: { rate: 3120, dec: 3, anchor: 1, syncw: 222, wofs: -2 },
    },
    hexCase: 'lower',
    entryCount: 16,
    samplingHint:
      'The C64/C128 draws 504 (PAL) or 520 (NTSC) dots per scanline and lumacode carries ' +
      '2 samples per pixel, oversampled 4x (PAL) or 3x (NTSC) = 4032 / 4 or 3120 / 3. The ' +
      'header also carries anchor=1, wofs=-2, and syncw=296 (PAL) or syncw=222 (NTSC), ' +
      'per-system constants.',
    protocolTokens: [],
  },
  vic20: {
    id: 'vic20',
    displayName: 'Commodore VIC-20',
    presetName: { pal: 'Commodore VIC-20 (PAL)', ntsc: 'Commodore VIC-20 (NTSC)' },
    header: {
      pal: { rate: 2272, dec: 4, anchor: 4, syncw: 128, wofs: 6 },
      ntsc: { rate: 2080, dec: 4, anchor: 0, syncw: 128, wofs: -2 },
    },
    hexCase: 'lower',
    entryCount: 16,
    samplingHint:
      'The VIC-20 draws 284 (PAL) or 260 (NTSC) dots per scanline and lumacode carries ' +
      '2 samples per pixel, oversampled 4x = 2272 / 4 or 2080 / 4. The header also carries ' +
      'syncw=128 and anchor=4 wofs=6 (PAL) or anchor=0 wofs=-2 (NTSC), per-system constants.',
    protocolTokens: [],
  },
  a7800: {
    id: 'a7800',
    displayName: 'Atari 7800',
    presetName: 'Atari 7800',
    header: { rate: 4086, dec: 3, anchor: 9, syncw: 126, wofs: 4 },
    hexCase: 'lower',
    entryCount: 256,
    samplingHint:
      "The 7800's MARIA generator draws 341 dots per scanline at 4 samples per dot with " +
      '2 symbols skipped at x=0, giving 1362 symbols per line; oversampled 3x = 4086 / 3 ' +
      'for both norms. The header also carries anchor=9, syncw=126, and wofs=4, per-system ' +
      'constants.',
    protocolTokens: [],
  },
  a2600: {
    id: 'a2600',
    displayName: 'Atari 2600',
    presetName: 'Atari 2600',
    header: { rate: 3648, dec: 4, anchor: 7, syncw: 224, wofs: -2 },
    hexCase: 'upper',
    entryCount: 256,
    samplingHint:
      'The 2600 draws 228 dots per scanline and lumacode carries 4 samples per pixel, ' +
      'oversampled 4x = 3648 / 4. The header also carries anchor=7, syncw=224, and ' +
      'wofs=-2, per-system constants.',
    protocolTokens: [],
  },
};

// Returns the resolved HeaderDefaults row (rate, dec, anchor, syncw, wofs)
// for the given system/TV norm, collapsing the { pal, ntsc } pair where the
// row is norm-keyed. Call before building a header line.
export function headerFor(system: SystemId, tvNorm: TvNorm): HeaderDefaults {
  const header = SYSTEMS[system].header;
  return 'pal' in header ? header[tvNorm] : header;
}

export function presetNameFor(system: SystemId, tvNorm: TvNorm): string {
  const presetName = SYSTEMS[system].presetName;
  return typeof presetName === 'string' ? presetName : presetName[tvNorm];
}

/**
 * Builds a fully-populated LmcOptions seeded from the SYSTEMS row for
 * (system, tvNorm). Use when a file is loaded (to seed the options form)
 * or to derive the NES `DEFAULT_OPTIONS` constant.
 *
 * @param system - Target system id.
 * @param tvNorm - PAL or NTSC; ignored for systems with one preset.
 * @returns LmcOptions with sampleRate/decimation/system/tvNorm set from
 *   SYSTEMS and empty name fields.
 *
 * Example:
 *   defaultOptionsFor('c64', 'ntsc') // { sampleRate: 3120, decimation: 3, ... }
 */
export function defaultOptionsFor(system: SystemId, tvNorm: TvNorm): LmcOptions {
  const header = headerFor(system, tvNorm);
  return {
    sampleRate: header.rate,
    decimation: header.dec,
    paletteName: '',
    sourceFileName: '',
    system,
    tvNorm,
  };
}
