// Section 4-equivalent mapping for Commodore systems: .vpl files list colors
// in Commodore color order (0=black .. 15=light grey); .lmc files order
// entries by lumacode symbol value. Framework-free by convention: no
// Angular package imports, no DOM types.

import { Rgb } from './models';

// Verified exact 16/16 against both golden pairs (cjam.vpl -> C64.lmc and
// vice.vpl -> VIC20.lmc). One permutation serves both systems: split into
// two mappers only if a future Commodore system diverges from it.
export const COMMODORE_TO_LUMACODE = [0, 6, 2, 4, 9, 11, 12, 3, 8, 14, 15, 7, 5, 10, 13, 1];

/**
 * Reorders 16 Commodore-order Rgb entries (from parseVpl) into LumaCode
 * order via the fixed COMMODORE_TO_LUMACODE permutation. Serves
 * both c64 and vic20 -- ConversionService.convert dispatches both cases
 * here.
 *
 * @param entries - Exactly 16 entries in Commodore color-number order.
 * @returns 16 fresh entries in LumaCode order; input is left unmodified.
 */
export function commodoreToLumacodeOrder(entries: Rgb[]): Rgb[] {
  return COMMODORE_TO_LUMACODE.map((sourceIndex) => ({ ...entries[sourceIndex] }));
}
