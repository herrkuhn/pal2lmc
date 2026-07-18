// Section 4-equivalent mapping for Atari systems: MARIA byte index (7800)
// and TIA index (2600) already match LumaCode entry order in the official
// presets, so this is an identity copy. Framework-free by convention: no
// Angular package imports, no DOM types. Exists as a spec-shaped seam --
// same call shape as toLumacodeOrder and commodoreToLumacodeOrder -- so
// ConversionService dispatch stays a uniform switch across all five
// systems, even though 7800/2600 need no reordering.
//
// The 7800 source table's hue-15 line duplicating its hue-1 line is a
// property of the MAME a7800p_colors table itself, not something this
// mapper relies on or enforces -- an identity copy passes any 256-entry
// input through unchanged regardless of hue duplication. The golden spec
// (golden-multisystem.spec.ts) asserts the duplication as a
// transcription guard on the fixture, independent of this mapper.

import { Rgb } from './models';

/**
 * Copies 256 entries unchanged. MARIA byte index (7800) and TIA index
 * (2600) already match LumaCode entry order in the official presets, so
 * no permutation is needed -- exists only to give ConversionService.convert
 * the same call shape for every system (toLumacodeOrder /
 * commodoreToLumacodeOrder / atariToLumacodeOrder).
 *
 * @param entries - 256 entries in source (MARIA/TIA) byte order.
 * @returns 256 fresh entries in the same order; input is left unmodified.
 */
export function atariToLumacodeOrder(entries: Rgb[]): Rgb[] {
  return entries.map((entry) => ({ ...entry }));
}
