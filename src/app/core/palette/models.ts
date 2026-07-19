// Domain model for the .pal -> .lmc conversion core. Framework-free by
// convention: no Angular package imports, no DOM types (spec S9.1).
// Angular reaches these types only through ConversionService.

import { defaultOptionsFor, SystemId, TvNorm } from './system';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

// Length exactly 64, NES PPU order ($00-$3F).
export type NesPalette = Rgb[];

export interface LmcOptions {
  sampleRate: number;
  decimation: number;
  paletteName: string;
  sourceFileName: string;
  // Absent means nes/pal; the UI always supplies both explicitly once a
  // file is loaded.
  system?: SystemId;
  tvNorm?: TvNorm;
  // Undefined means "generate the default S3.3 comment block"; a string
  // (including '') means the user edited or cleared it. serializeLmc must
  // preserve this distinction rather than defaulting undefined to ''.
  comment?: string;
}

// Discriminated union, never a thrown exception: parse failure is visible in
// the type signature so callers cannot forget to handle it. The container
// component branches on ok:false and renders message in the error. All
// three parser result unions (ParseResult, VplParseResult, AtariParseResult)
// share this error shape, { ok: false; reason; message: string }, with
// message built by the owning parser rather than a shared formatter -- a
// fourth format's error shape costs no new service-side extraction logic
// (DL-003). ParseResult's success field is named entries; its type is
// NesPalette, matching VplParseResult and AtariParseResult (DL-004).
export type ParseResult =
  | { ok: true; entries: NesPalette; emphasisIgnored: boolean }
  | { ok: false; reason: 'invalid-size'; message: string };

// .vpl text format (VICE palette files): 16 Commodore-order entries.
// TYPE tag capture uses exact-token matching (VIC is a prefix of VICII, so
// substring matching would misroute every C64 file to VIC-20).
export type VplParseResult =
  | { ok: true; entries: Rgb[]; machine?: 'c64' | 'vic20'; name?: string; ditherIgnored: boolean }
  | { ok: false; reason: 'wrong-entry-count' | 'bad-line'; message: string };

// 768-byte Atari .pal format: 256 entries read straight through (MARIA byte
// index = file index). duplicatePairsBroken feeds the 2600 detection
// heuristic and its UI notice; it is never a parse error.
export type AtariParseResult =
  | { ok: true; entries: Rgb[]; duplicatePairsBroken: boolean }
  | { ok: false; reason: 'invalid-size'; message: string };

// The converter page needs a pre-load NES seed for its options signal
// regardless of how many systems are supported, so the constant is kept --
// derived from SYSTEMS rather than duplicated.
export const DEFAULT_OPTIONS: LmcOptions = defaultOptionsFor('nes', 'pal');
