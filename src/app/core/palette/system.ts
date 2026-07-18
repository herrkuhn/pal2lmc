// Per-system facts for the .pal/.vpl -> .lmc conversion core. Framework-free
// by convention: no Angular package imports, no DOM types (spec S9.1).
// This is the single source of per-system knowledge: header defaults, hex
// case, entry count, preset comment wording, and the advanced-panel sampling
// hint. serializeLmc, defaultOptionsFor, and the options-form UI all read
// the same SYSTEMS row rather than threading these facts as ad-hoc
// parameters.

import type { LmcOptions } from './models';

export type SystemId = 'nes' | 'c64' | 'vic20' | 'a7800' | 'a2600';
// Meaningful for c64/vic20 only -- NES and the two Atari systems carry one
// preset each, so their header/presetName rows are not norm-keyed.
export type TvNorm = 'pal' | 'ntsc';

export interface HeaderDefaults {
  rate: number;
  dec: number;
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
}

// Single authoritative row per system: header defaults per
// TV norm, hex case, entry count, preset comment wording, and the
// advanced-panel sampling hint. Norm affects only the header pair and
// comment text, never color data.
export const SYSTEMS: Record<SystemId, SystemRow> = {
  nes: {
    id: 'nes',
    displayName: 'NES / Famicom',
    presetName: 'NES / Famicom',
    header: { rate: 4092, dec: 4 },
    hexCase: 'lower',
    entryCount: 64,
    samplingHint:
      'The NES draws 341 dots per scanline and lumacode carries 3 samples per pixel, ' +
      'oversampled 4x = 4092. Every official NES preset uses 4092 / 4.',
  },
  c64: {
    id: 'c64',
    displayName: 'Commodore 64 / C128',
    presetName: { pal: 'Commodore 64 / C128 (PAL)', ntsc: 'Commodore 64 / C128 (NTSC)' },
    header: {
      pal: { rate: 4032, dec: 4 },
      ntsc: { rate: 3120, dec: 3 },
    },
    hexCase: 'lower',
    entryCount: 16,
    samplingHint:
      'The C64/C128 draws 504 (PAL) or 520 (NTSC) dots per scanline and lumacode carries ' +
      '2 samples per pixel, oversampled 4x (PAL) or 3x (NTSC) = 4032 / 4 or 3120 / 3.',
  },
  vic20: {
    id: 'vic20',
    displayName: 'Commodore VIC-20',
    presetName: { pal: 'Commodore VIC-20 (PAL)', ntsc: 'Commodore VIC-20 (NTSC)' },
    header: {
      pal: { rate: 2272, dec: 4 },
      ntsc: { rate: 2080, dec: 4 },
    },
    hexCase: 'lower',
    entryCount: 16,
    samplingHint:
      'The VIC-20 draws 284 (PAL) or 260 (NTSC) dots per scanline and lumacode carries ' +
      '2 samples per pixel, oversampled 4x = 2272 / 4 or 2080 / 4.',
  },
  a7800: {
    id: 'a7800',
    displayName: 'Atari 7800',
    presetName: 'Atari 7800',
    header: { rate: 3900, dec: 3 },
    hexCase: 'lower',
    entryCount: 256,
    samplingHint:
      'The 7800 preset copies the official header verbatim: 3900 / 3 (1300 symbols per ' +
      "line); this does not factor against a confirmed MARIA dot count the way the other " +
      'systems\' formulas do.',
  },
  a2600: {
    id: 'a2600',
    displayName: 'Atari 2600',
    presetName: 'Atari 2600',
    header: { rate: 3648, dec: 4 },
    hexCase: 'upper',
    entryCount: 256,
    samplingHint:
      'The 2600 draws 228 dots per scanline and lumacode carries 4 samples per pixel, ' +
      'oversampled 4x = 3648 / 4.',
  },
};

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
 *   SYSTEMS, color0d defaulted to 'visible', and empty name fields.
 *
 * Example:
 *   defaultOptionsFor('c64', 'ntsc') // { sampleRate: 3120, decimation: 3, ... }
 */
export function defaultOptionsFor(system: SystemId, tvNorm: TvNorm): LmcOptions {
  const header = headerFor(system, tvNorm);
  return {
    sampleRate: header.rate,
    decimation: header.dec,
    color0d: 'visible',
    paletteName: '',
    sourceFileName: '',
    system,
    tvNorm,
  };
}
