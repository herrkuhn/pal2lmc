// Text content of the official golden .lmc presets shipped by the RT4K developer,
// byte-identical to the firmware's lumacode/NES/*.lmc tree (and the two remaining
// top-level NES presets that are golden pairs, PC-10.lmc and Sony CXA.lmc),
// including LF endings and the single trailing newline.
//
// PC10_LMC and SONY_CXA_LMC are sourced from the corpus's top level; the other
// nine pairs come from lumacode/NES/. DIAG.lmc is an identity ramp (index 21
// 545454, index 35 8c8c8c, anchor=1 without nes=1) with no .pal counterpart and
// serves only as a format reference, never a golden pair (spec S8). The generic
// top-level NES.lmc's data lines match none of the eleven vendored source
// palettes, so no round-trip can be asserted for it either. The four NES HDR
// variants ARE golden pairs -- their source .pal files come from
// rt4k_nes_hdr_v2.zip in the RetroTINK-LLC firmware repo (see GOLDEN_PAIRS
// sources below), not fbx_pal/.
import {
  COMPOSITE_DIRECT_FBX_PAL_B64,
  NES_CLASSIC_FBX_PAL_B64,
  NES_HDR_MEDIUM_CLAMP_PAL_B64,
  NES_HDR_RAW_PAL_B64,
  NES_HDR_SOFT_CLAMP_PAL_B64,
  NES_HDR_SONY_DECODER_PAL_B64,
  PC10_PAL_B64,
  PVM_STYLE_D93_FBX_PAL_B64,
  SMOOTH_FBX_PAL_B64,
  SONY_CXA_PAL_B64,
  WAVEBEAM_PAL_B64,
} from './pal-fixtures';

// Source: lumacode/NES/Composite Direct (FBX).lmc
export const COMPOSITE_DIRECT_FBX_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- Composite Direct (FBX) palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,656565,00127d,18008e,360082,56005d,5a0018,4f0500,381900
1d3100,003d00,004100,003b17,002e55,000000,afafaf,194ec8,472fe3,6b1fd7,931bae,9e1a5e,993200,7b4b00,5b6700,267a00
008200,007a3e,006e8a,000000,ffffff,64a9ff,8e89ff,b676ff,e06fff,ef6cc4,f0806a,d8982c,b9b40a,83cb0c,5bd63f,4ad17e
4dc7cb,4c4c4c,ffffff,c7e5ff,d9d9ff,e9d1ff,f9ceff,ffccf1,ffd4cb,f8dfb1,edeaa4,d6f4a4,c5f8b8,bef6d3,bff1f1,b9b9b9
`;

// Source: lumacode/NES/NES Classic (FBX).lmc
export const NES_CLASSIC_FBX_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- NES Classic (FBX) palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,616161,000088,1f0d99,371379,561260,5d0010,520e00,3a2308
21350c,0d410e,174417,003a1f,002f57,000000,aaaaaa,0d4dc4,4b24de,6912cf,9014ad,9d1c48,923404,735005,5d6913,167a11
138008,127649,1c6691,000000,fcfcfc,639afc,8a7efc,b06afc,dd6df2,e771ab,e38658,cc9e22,a8b100,72c100,5acd4e,34c28e
4fbece,424242,fcfcfc,bed4fc,cacafc,d9c4fc,ecc1fc,fac3e7,f7cec3,e2cda7,dadb9c,c8e39e,bfe5b8,b2ebc8,b7e5eb,acacac
`;

// Source: lumacode/PC-10.lmc
export const PC10_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- PC-10 palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).
# PC-10 source $1D = 242424; raw 35 is kept black because it also carries $0F, the black most games use.

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,6d6d6d,002492,0000db,6d49db,92006d,b6006d,b62400,924900
6d4900,244900,006d24,009200,004949,000000,b6b6b6,006ddb,0049ff,9200ff,b600ff,ff0092,ff0000,db6d00,926d00,249200
009200,00b66d,009292,000000,ffffff,6db6ff,9292ff,db6dff,ff00ff,ff6dff,ff9200,ffb600,dbdb00,6ddb00,00ff00,49ffdb
00ffff,494949,ffffff,b6dbff,dbb6ff,ffb6ff,ff92ff,ffb6b6,ffdb92,ffff49,ffff6d,b6ff49,92ff6d,49ffdb,92dbff,929292
`;

// Source: lumacode/NES/PVM Style D93 (FBX).lmc
export const PVM_STYLE_D93_FBX_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- PVM Style D93 (FBX) palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,696b63,001774,1e0087,340073,560057,5e0013,531a00,3b2400
243000,063a00,003f00,003b1e,00334e,000000,b9bbb3,1453b9,4d2cda,671ede,98189c,9d2344,a03e00,8d5500,656d00,2c7900
008100,007d42,00788a,000000,ffffff,69a8ff,9691ff,b28afa,ea7dfa,f37bc7,f28e59,e6ad27,d7c805,90df07,64e53c,45e27d
48d5d9,4e5048,ffffff,d2eaff,e2e2ff,e9d8ff,f5d2ff,f8d9ea,fadeb9,f9e89b,f3f28c,d3fa91,b8fca8,aefaca,caf3f3,bec0b8
`;

// Source: lumacode/NES/Smooth (FBX).lmc
export const SMOOTH_FBX_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- Smooth (FBX) palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,6a6d6a,001380,1e008a,39007a,550056,5a0018,4f1000,3d1c00
253200,003d00,004000,003924,002e55,000000,b9bcb9,1850c7,4b30e3,7322d6,951fa9,9d285c,983700,7f4c00,5e6400,227700
027e02,007645,006e8a,000000,ffffff,68a6ff,8c9cff,b586ff,d975fd,e377b9,e58d68,d49d29,b3af0c,7bc211,55ca47,46cb81
47c1c5,4a4d4a,ffffff,cceaff,dddeff,ecdaff,f8d7fe,fcd6f5,fddbcf,f9e7b5,f1f0aa,dafaa9,c9ffbc,c3fbd7,c4f6f6,bec1be
`;

// Source: lumacode/Sony CXA.lmc
export const SONY_CXA_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- Sony CXA palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,585858,00238c,00139b,2d0585,5d0052,7a0017,7a0800,5f1800
352a00,093900,003f00,003c22,00325d,000000,a1a1a1,0053ee,153cfe,6028e4,a91d98,d41e41,d22c00,aa4400,6c5e00,2d7300
007d06,007852,0069a9,000000,ffffff,1fa5fe,5e89fe,b572fe,fe65f6,fe6790,fe773c,fe9308,c4b200,79ca10,3ad54a,11d1a4
06bffe,424242,ffffff,a0d9fe,bdccfe,e1c2fe,febcfb,febdd0,fec5a9,fed18e,e9de86,c7e992,a8eeb0,95ecd9,91e4fe,acacac
`;

// Source: lumacode/NES/Wavebeam.lmc
export const WAVEBEAM_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- Wavebeam palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# Palette by FirebrandX: https://www.firebrandx.com/nespalette.html
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,6b6b6b,001b88,21009a,40008c,600067,64001e,590800,481600
283600,004500,004908,00421d,003659,000000,b4b4b4,1555d3,4337ef,7425df,9c19b9,ac0f64,aa2c00,8a4b00,666b00,218300
008a00,008144,007691,000000,ffffff,63b2ff,7c9cff,c07dfe,e977ff,f572cd,f4886b,dda029,bdbd0a,89d20e,5cde3e,4bd886
4dcfd2,525252,ffffff,bcdfff,d2d2ff,e1c8ff,efc7ff,ffc3e1,ffcac6,f2daad,ebe3a0,d2eda2,bcf4b4,b5f1ce,b6ecf1,bfbfbf
`;

// Source: lumacode/NES/NES HDR Raw.lmc
export const NES_HDR_RAW_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- NES HDR Raw palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# NES HDR palette by Mike Chi / RetroTINK:
# https://github.com/RetroTINK-LLC/firmware/tree/main/misc/NES%20HDR%20Palettes
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,393939,050f71,10097f,2e0871,430547,4c040b,430400,2c0f00
0e2400,043000,053400,042e0b,042047,000000,6c6c6c,1231b3,3420c6,5b17b3,79127e,830f30,771d00,5a3500,334d00,135f00
106400,0f5b30,0e487e,000000,a2a2a2,4368ec,6b51ff,9242ec,af3cb5,b94168,ae5416,916c00,698500,439600,2c9b14,259368
2b80b5,2b2b2b,a2a2a2,7c8cc1,8c81c8,9c7bc1,a779aa,ab7b8c,a7836d,9c8d55,8c974c,7c9d55,71a06d,6d9c8c,7194aa,757575
`;

// Source: lumacode/NES/NES HDR Soft Clamp.lmc
export const NES_HDR_SOFT_CLAMP_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- NES HDR Soft Clamp palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# NES HDR palette by Mike Chi / RetroTINK:
# https://github.com/RetroTINK-LLC/firmware/tree/main/misc/NES%20HDR%20Palettes
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,3f3f3f,06117d,120a8d,33087d,4b064f,55040d,4b0400,311100
102700,043600,063a00,04330d,04234f,000000,787878,1437c2,3a23d2,6519c2,86148c,911136,842000,643b00,385600,156a00
126f00,116536,10508c,000000,b4b4b4,4b74f0,765aff,a249f0,bf42c4,c74874,be5d18,a17800,759400,4ba600,31ac17,29a374
308ec4,303030,b4b4b4,8a9bce,9b90d4,ad89ce,b986bb,bc899b,b99179,ad9c5e,9ba855,8aaf5e,7db279,79ad9b,7da5bb,828282
`;

// Source: lumacode/NES/NES HDR Medium Clamp.lmc
export const NES_HDR_MEDIUM_CLAMP_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- NES HDR Medium Clamp palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# NES HDR palette by Mike Chi / RetroTINK:
# https://github.com/RetroTINK-LLC/firmware/tree/main/misc/NES%20HDR%20Palettes
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,454545,061288,140b99,370988,510656,5c050e,510500,361200
112b00,053a00,063f00,05370e,052656,000000,828282,153ccf,3f26dc,6e1ccf,911597,9e123a,902300,6d4000,3d5d00,177300
147900,126e3a,115797,000000,c4c4c4,517df4,8162ff,b050f4,cc48d1,d34e7d,cc651a,ae8200,7fa100,51b500,36bb18,2cb27d
349bd1,343434,c4c4c4,96a8d8,a89cdd,bc94d8,c791c9,ca94a8,c79e84,bcaa67,a8b65c,96be67,88c184,84bca8,88b3c9,8d8d8d
`;

// Source: lumacode/NES/NES HDR Sony Decoder.lmc
export const NES_HDR_SONY_DECODER_LMC = `# RetroTINK LumaCode preset: NES / Famicom -- NES HDR Sony Decoder palette
# anchor=1: NES word anchor of the tap -> word-offset rule, measured on the reference generator 2026-09-16
# (identical at the 9/16/35 MHz filters; see lumacode_configs/LUMACODE_UNIVERSE.md). nes=1: NES protocol --
# the 1.82.0 FPGA articles render the PPU emphasis commands (words 0..7) as a colour tint; older articles ignore it.
# First line = ADC sample rate and decimation, applied when loaded.
# NES HDR palette by Mike Chi / RetroTINK:
# https://github.com/RetroTINK-LLC/firmware/tree/main/misc/NES%20HDR%20Palettes
# Raw 0..7 are the PPUdigitizer emphasis commands and raw 21 is $0D (blacker than black, also the border
# word): all black. Raw 35 renders $1D and every $xE/$xF black (the digitizer folds them together).

4092 4 anchor=1 nes=1

000000,000000,000000,000000,000000,000000,000000,000000,494949,061b6b,1b1377,2e0f6b,3d0c49,430d1b,3d1300,2e1b00
1b2100,062700,002800,00271b,002249,000000,7f7f7f,2440ad,4036bf,5b30ad,6e2d7f,762e40,6e3600,5b3f00,404900,245100
105400,095140,104b7f,000000,bdbdbd,5f7def,7c73ff,986bef,ad68bd,b46a7c,ad713a,987c0a,7c8600,5f8e0a,4b913a,438e7c
4b86bd,3a3a3a,bdbdbd,98a4d1,a4a0d8,ae9dd1,b79bbd,ba9da4,b7a089,aea476,a4a76e,98aa76,8fab89,8caba4,8fa9bd,898989
`;

// Canonical public download for a fixture file: enough to re-fetch it if the
// base64/text embedding is ever replaced by download-on-init (fetch url,
// extract pathInArchive). Verified live 2026-09-18.
export interface FixtureSource {
  /** Direct download URL of the archive containing the file. */
  url: string;
  /** Path of the file inside that archive. */
  pathInArchive: string;
}

// FirebrandX November-2017 bundle ("Novemeber" typo is in the real URL);
// linked from https://www.firebrandx.com/nespalette.html. All seven
// fbx_pal/*.pal files sit at the archive top level under the same names.
const FBX_PAL_BUNDLE = 'https://www.firebrandx.com/downloads/Novemeber-2017-Palettes.zip';

// Mike Chi's NES HDR .pal set v2 (RetroTINK-LLC/firmware repo,
// misc/NES HDR Palettes): four 192-byte .pal files plus instructions.txt.
const NES_HDR_PAL_BUNDLE =
  'https://github.com/RetroTINK-LLC/firmware/raw/main/misc/NES%20HDR%20Palettes/rt4k_nes_hdr_v2.zip';

// RT4K experimental firmware 1.82.1 SD-card bundle, the origin of every
// official .lmc preset fixture (its lumacode/ tree is byte-identical to the
// vendored lumacode/ corpus). Linked from
// https://retrotink-llc.github.io/firmware/4k-experimental.html.
const RT4K_FIRMWARE_1821 =
  'https://cdn.jsdelivr.net/gh/retrotink-llc/firmware@main/RetroTINK-4K/Experimental/rt4k_1821.zip';

const fbxPal = (file: string): FixtureSource => ({ url: FBX_PAL_BUNDLE, pathInArchive: file });
const hdrPal = (file: string): FixtureSource => ({ url: NES_HDR_PAL_BUNDLE, pathInArchive: file });
// Exported for the sibling fixture files (lmc-multisystem-fixtures.ts,
// atari-fixtures.ts) so a firmware bump edits one URL, not three. `file`
// is the in-archive path under the firmware zip's lumacode/ tree, e.g.
// 'lumacode/NES/Wavebeam.lmc' or 'lumacode/PC-10.lmc'.
export const firmwareLmc = (file: string): FixtureSource => ({
  url: RT4K_FIRMWARE_1821,
  pathInArchive: file,
});

// One golden pair per source .pal file (spec S8): the source bytes plus the
// official .lmc text they must reproduce, each with its canonical download.
// golden.spec.ts iterates this array so adding a corpus pair means adding one
// entry here, not new test code.
export interface GoldenPair {
  name: string;
  palBase64: string;
  palSource: FixtureSource;
  lmcText: string;
  lmcSource: FixtureSource;
}

export const GOLDEN_PAIRS: GoldenPair[] = [
  {
    name: 'Composite Direct (FBX)',
    palBase64: COMPOSITE_DIRECT_FBX_PAL_B64,
    palSource: fbxPal('Composite Direct (FBX).pal'),
    lmcText: COMPOSITE_DIRECT_FBX_LMC,
    lmcSource: firmwareLmc('lumacode/NES/Composite Direct (FBX).lmc'),
  },
  {
    name: 'NES Classic (FBX)',
    palBase64: NES_CLASSIC_FBX_PAL_B64,
    palSource: fbxPal('NES Classic (FBX).pal'),
    lmcText: NES_CLASSIC_FBX_LMC,
    lmcSource: firmwareLmc('lumacode/NES/NES Classic (FBX).lmc'),
  },
  {
    name: 'PC-10',
    palBase64: PC10_PAL_B64,
    palSource: fbxPal('PC-10.pal'),
    lmcText: PC10_LMC,
    lmcSource: firmwareLmc('lumacode/PC-10.lmc'),
  },
  {
    name: 'PVM Style D93 (FBX)',
    palBase64: PVM_STYLE_D93_FBX_PAL_B64,
    palSource: fbxPal('PVM Style D93 (FBX).pal'),
    lmcText: PVM_STYLE_D93_FBX_LMC,
    lmcSource: firmwareLmc('lumacode/NES/PVM Style D93 (FBX).lmc'),
  },
  {
    name: 'Smooth (FBX)',
    palBase64: SMOOTH_FBX_PAL_B64,
    palSource: fbxPal('Smooth (FBX).pal'),
    lmcText: SMOOTH_FBX_LMC,
    lmcSource: firmwareLmc('lumacode/NES/Smooth (FBX).lmc'),
  },
  {
    name: 'Sony CXA',
    palBase64: SONY_CXA_PAL_B64,
    palSource: fbxPal('Sony CXA.pal'),
    lmcText: SONY_CXA_LMC,
    lmcSource: firmwareLmc('lumacode/Sony CXA.lmc'),
  },
  {
    name: 'Wavebeam',
    palBase64: WAVEBEAM_PAL_B64,
    palSource: fbxPal('Wavebeam.pal'),
    lmcText: WAVEBEAM_LMC,
    lmcSource: firmwareLmc('lumacode/NES/Wavebeam.lmc'),
  },
  {
    name: 'NES HDR Raw',
    palBase64: NES_HDR_RAW_PAL_B64,
    palSource: hdrPal('rt4k_nes_hdr_raw.pal'),
    lmcText: NES_HDR_RAW_LMC,
    lmcSource: firmwareLmc('lumacode/NES/NES HDR Raw.lmc'),
  },
  {
    name: 'NES HDR Soft Clamp',
    palBase64: NES_HDR_SOFT_CLAMP_PAL_B64,
    palSource: hdrPal('rt4k_nes_hdr_soft_clamp.pal'),
    lmcText: NES_HDR_SOFT_CLAMP_LMC,
    lmcSource: firmwareLmc('lumacode/NES/NES HDR Soft Clamp.lmc'),
  },
  {
    name: 'NES HDR Medium Clamp',
    palBase64: NES_HDR_MEDIUM_CLAMP_PAL_B64,
    palSource: hdrPal('rt4k_nes_hdr_med_clamp.pal'),
    lmcText: NES_HDR_MEDIUM_CLAMP_LMC,
    lmcSource: firmwareLmc('lumacode/NES/NES HDR Medium Clamp.lmc'),
  },
  {
    name: 'NES HDR Sony Decoder',
    palBase64: NES_HDR_SONY_DECODER_PAL_B64,
    palSource: hdrPal('rt4k_sony_hdr_no_knee.pal'),
    lmcText: NES_HDR_SONY_DECODER_LMC,
    lmcSource: firmwareLmc('lumacode/NES/NES HDR Sony Decoder.lmc'),
  },
];
