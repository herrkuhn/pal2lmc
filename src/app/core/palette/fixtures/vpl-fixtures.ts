// Text content of the vendored VICE .vpl sources, byte-identical to
// vice_vpl/cjam.vpl and vice_vpl/vice.vpl (LF endings, single trailing
// newline), plus two synthetic constants for parser-only coverage that
// have no vendored file or golden pairing.
//
// Generated (not hand-typed) from the fetched source files so the corpus
// bytes and this embedding cannot drift silently, following the pal-
// fixtures.ts / lmc-fixtures.ts convention of embedding text/base64 rather
// than loading test assets. vice_vpl/ is a never-edit byte-exact oracle
// dir, same rule as fbx_pal/, so this embedding is the only place that
// content can safely be annotated.

import { FixtureSource } from './lmc-fixtures';

const VICE_SVN_MIRROR = 'https://raw.githubusercontent.com/VICE-Team/svn-mirror/main';

export const vplSource = (pathInArchive: string): FixtureSource => ({
  url: `${VICE_SVN_MIRROR}/${pathInArchive}`,
  pathInArchive,
});

// Source: vice_vpl/cjam.vpl (ChristopherJam JamPal, TYPE:VICII / c64).
export const CJAM_VPL_SOURCE = vplSource('vice/data/C64/cjam.vpl');
export const CJAM_VPL = `#
# VICE Palette file
#
# Syntax:
# Red Green Blue
#
# taken from http://jamontoads.net/p/lumachroma.html
#
# TYPE:VICII
# NAME:Christopher Jam

# Black
00 00 00

# White
FF FF FF

# Red
7d 20 2c

# Cyan
4f b3 a5

# Purple
84 25 8c

# Green
33 98 40

# Blue
2a 1b 9d

# Yellow
bf d0 4a

# Orange
7f 41 0d

# Brown
4c 2e 00

# Light Red
b4 4f 5c

# Dark Gray
3c 3c 3c

# Medium Gray
64 64 64

# Light Green
7c e5 87

# Light Blue
63 51 db

# Light Gray
93 93 93
`;

// Source: vice_vpl/vice.vpl (VICE default VIC-20 palette, TYPE:VIC / vic20).
export const VICE_VPL_SOURCE = vplSource('vice/data/VIC20/vice.vpl');
export const VICE_VPL = `#
# VICE Palette file
#
# Syntax:
# Red Green Blue
#
# TYPE:VIC
# NAME:original VICE palette

# Black
00 00 00

# White
FF FF FF

# Red
F0 00 00

# Cyan
00 F0 F0

# Purple
60 00 60

# Green
00 A0 00

# Blue
00 00 F0

# Yellow
D0 D0 00

# Orange
C0 A0 00

# Light Orange
FF A0 00

# Pink
F0 80 80

# Light Cyan
00 FF FF

# Light Purple
FF 00 FF

# Light Green
00 FF 00

# Light Blue
00 A0 FF

# Light Yellow
FF FF 00
`;

// Not vendored in vice_vpl/ -- embedded only for parser unit-test coverage
// of single-digit hex ("0  0  0" for Black), which neither cjam.vpl nor
// vice.vpl exercises.
export const PEPTO_NTSC_VPL_SOURCE = vplSource('vice/data/C64/pepto-ntsc.vpl');
export const PEPTO_NTSC_VPL = `#
# VICE Palette file
#
# Syntax:
# Red Green Blue
#
# TYPE:VICII
# NAME:Pepto (NTSC)

# this palette was calculated for NTSC according to http://www.pepto.de/projects/colorvic/
# using the FCC sanctioned decoder matrix - this is almost identical to the PAL palette!

# Black
0  0  0

# White
FF FF FF

# Red
67 37 2B

# Cyan
70 A3 B1

# Purple
6F 3D 86

# Green
58 8C 42

# Blue
34 28 79

# Yellow
B7 C6 6E

# Orange
6F 4E 25

# Brown
42 38 0

# Light Red
99 66 59

# Dark Gray
43 43 43

# Medium Gray
6B 6B 6B

# Light Green
9A D1 83

# Light Blue
6B 5E B5

# Light Gray
95 95 95
`;

// Synthetic (no vendored file): 16 data lines carrying a legacy 4th dither
// nibble, for ditherIgnored coverage that no fetched VICE file exercises.
export const LEGACY_DITHER_VPL = `# TYPE:VICII
# NAME:Legacy Dither Sample
00 00 00 0
11 11 11 1
22 22 22 2
33 33 33 3
44 44 44 4
55 55 55 5
66 66 66 6
77 77 77 7
88 88 88 8
99 99 99 9
aa aa aa a
bb bb bb b
cc cc cc c
dd dd dd d
ee ee ee e
ff ff ff f
`;
