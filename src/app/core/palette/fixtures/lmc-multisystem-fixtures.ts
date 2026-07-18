// Text content of the official Tier 1 Commodore .lmc presets, byte-
// identical to lumacode/C64.lmc, lumacode/C64_NTSC.lmc, lumacode/VIC20.lmc,
// and lumacode/VIC20_NTSC.lmc (LF endings, single trailing newline),
// mirroring lmc-fixtures.ts's embedding convention. GOLDEN_PAIRS_TIER1 ties
// each vendored .vpl source to its oracle text, system, norm, and expected
// header pair, so golden-multisystem.spec.ts can iterate it the same way
// golden.spec.ts iterates GOLDEN_PAIRS.

import { SystemId, TvNorm } from '../system';
import { FixtureSource } from './lmc-fixtures';
import { CJAM_VPL, VICE_VPL } from './vpl-fixtures';

// RT4K experimental firmware 1.51.0 SD-card bundle -- same origin as the
// NES golden pairs (lmc-fixtures.ts), whose lumacode/ tree is byte-
// identical to the vendored lumacode/ corpus.
const RT4K_FIRMWARE_1510 =
  'https://cdn.jsdelivr.net/gh/retrotink-llc/firmware@main/RetroTINK-4K/Experimental/rt4k_1510.zip';

const firmwareLmc = (file: string): FixtureSource => ({
  url: RT4K_FIRMWARE_1510,
  pathInArchive: file,
});

// Source: lumacode/C64.lmc
export const C64_LMC = `# RetroTINK LumaCode preset: Commodore 64 / C128 (PAL)
# First line = ADC sample rate and decimation, applied when loaded.
# Only NES timing is fully verified so far -- treat the sample rate and
# decimation here as a starting point and adjust in the menu if needed.
# PAL machines. NTSC machines: use C64_NTSC.lmc.

4032 4

000000,2a1b9d,7d202c,84258c,4c2e00,3c3c3c,646464,4fb3a5,7f410d,6351db,939393,bfd04a,339840,b44f5c,7ce587,ffffff
`;

// Source: lumacode/C64_NTSC.lmc
export const C64_NTSC_LMC = `# RetroTINK LumaCode preset: Commodore 64 / C128 (NTSC)
# First line = ADC sample rate and decimation, applied when loaded.
# Only NES timing is fully verified so far -- treat the sample rate and
# decimation here as a starting point and adjust in the menu if needed.
# NTSC machines. PAL machines: use C64.lmc. Very early NTSC boards
# (R56A VIC-II) may need 3072 samples per line instead.

3120 3

000000,2a1b9d,7d202c,84258c,4c2e00,3c3c3c,646464,4fb3a5,7f410d,6351db,939393,bfd04a,339840,b44f5c,7ce587,ffffff
`;

// Source: lumacode/VIC20.lmc
export const VIC20_LMC = `# RetroTINK LumaCode preset: Commodore VIC-20 (PAL)
# First line = ADC sample rate and decimation, applied when loaded.
# Only NES timing is fully verified so far -- treat the sample rate and
# decimation here as a starting point and adjust in the menu if needed.
# PAL machines. NTSC machines: use VIC20_NTSC.lmc.

2272 4

000000,0000f0,f00000,600060,ffa000,00ffff,ff00ff,00f0f0,c0a000,00a0ff,ffff00,d0d000,00a000,f08080,00ff00,ffffff
`;

// Source: lumacode/VIC20_NTSC.lmc
export const VIC20_NTSC_LMC = `# RetroTINK LumaCode preset: Commodore VIC-20 (NTSC)
# First line = ADC sample rate and decimation, applied when loaded.
# Only NES timing is fully verified so far -- treat the sample rate and
# decimation here as a starting point and adjust in the menu if needed.
# NTSC machines. PAL machines: use VIC20.lmc.

2080 4

000000,0000f0,f00000,600060,ffa000,00ffff,ff00ff,00f0f0,c0a000,00a0ff,ffff00,d0d000,00a000,f08080,00ff00,ffffff
`;

export interface GoldenPairTier1 {
  name: string;
  vplText: string;
  system: SystemId;
  tvNorm: TvNorm;
  lmcText: string;
  lmcSource: FixtureSource;
  expectedHeader: { rate: number; dec: number };
}

export const GOLDEN_PAIRS_TIER1: GoldenPairTier1[] = [
  {
    name: 'cjam.vpl PAL -> C64.lmc',
    vplText: CJAM_VPL,
    system: 'c64',
    tvNorm: 'pal',
    lmcText: C64_LMC,
    lmcSource: firmwareLmc('lumacode/C64.lmc'),
    expectedHeader: { rate: 4032, dec: 4 },
  },
  {
    name: 'cjam.vpl NTSC -> C64_NTSC.lmc',
    vplText: CJAM_VPL,
    system: 'c64',
    tvNorm: 'ntsc',
    lmcText: C64_NTSC_LMC,
    lmcSource: firmwareLmc('lumacode/C64_NTSC.lmc'),
    expectedHeader: { rate: 3120, dec: 3 },
  },
  {
    name: 'vice.vpl PAL -> VIC20.lmc',
    vplText: VICE_VPL,
    system: 'vic20',
    tvNorm: 'pal',
    lmcText: VIC20_LMC,
    lmcSource: firmwareLmc('lumacode/VIC20.lmc'),
    expectedHeader: { rate: 2272, dec: 4 },
  },
  {
    name: 'vice.vpl NTSC -> VIC20_NTSC.lmc',
    vplText: VICE_VPL,
    system: 'vic20',
    tvNorm: 'ntsc',
    lmcText: VIC20_NTSC_LMC,
    lmcSource: firmwareLmc('lumacode/VIC20_NTSC.lmc'),
    expectedHeader: { rate: 2080, dec: 4 },
  },
];
