# core/palette

## Overview

Converts emulator palette source files -- NES `.pal`, Commodore 64 and
VIC-20 VICE `.vpl`, and Atari 7800 and 2600 768-byte `.pal` -- into
RetroTINK-4K LumaCode `.lmc` presets for their respective systems. Each
system's conversion is a re-indexing, not a reformat, but the mapping
differs per system: NES `.pal` stores 64 colors in NES PPU order
(`$00`-`$3F`) and reorders into 64 LumaCode entries (8 reserved black
entries, then 4 rows of 14 hues, dropping PPU columns `$xE`/`$xF`); the
Commodore mapping is a fixed 16-entry permutation
(`COMMODORE_TO_LUMACODE`); the Atari mapping is identity (source index
equals LumaCode/MARIA-byte index). A naive 1:1 byte dump parses on the
RT4K device but renders wrong colors for NES and Commodore sources.

Framework-free by convention (spec S9.1): nothing here imports Angular
packages or touches the DOM. `ConversionService` in
`src/app/features/converter/` is the only caller.

## Architecture

Parsers and mappers are sibling pure functions per system (spec S9.4's
extension-point rule -- no strategy pattern or mapper registry):

```
parsePal(bytes) -> ParseResult                    # pal-parser.ts, NES
parseVpl(text) -> VplParseResult                  # vpl-parser.ts, C64/VIC-20
parseAtariPal(bytes) -> AtariParseResult          # atari-pal-parser.ts, 7800/2600

toLumacodeOrder(palette, color0d) -> Rgb[]        # lumacode-mapper.ts, NES
commodoreToLumacodeOrder(entries) -> Rgb[]        # commodore-mapper.ts, C64/VIC-20
atariToLumacodeOrder(entries) -> Rgb[]            # atari-mapper.ts, 7800/2600

serializeLmc(entries, opts) -> string             # lmc-serializer.ts, all systems
```

`system.ts` holds the `SYSTEMS` table, the single source of per-system facts:
header defaults per TV norm, hex case, entry count, preset comment wording,
and the sampling-rate hint shown in the UI. `serializeLmc` reads hex case
and comment wording from this table rather than branching on `SystemId`
itself.

`fixtures/` holds the golden-test corpus, base64-embedded rather than loaded
as test assets: `pal-fixtures.ts` mirrors the eleven NES source `.pal`
files (seven from `fbx_pal/`, four NES HDR palettes not vendored in the
repo), `vpl-fixtures.ts` mirrors the two vendored `vice_vpl/` sources, and
`atari-fixtures.ts` holds the constructed 7800 and 2600 source palettes
(MAME `a7800p_colors` extracted by script, a Wikipedia 2600 table with
duplicated adjacent pairs -- see Invariants). `lmc-fixtures.ts` and
`lmc-multisystem-fixtures.ts` mirror the matching official `.lmc` files;
`spec-helpers.ts` holds shared test utilities (`dataLinesOf` and friends)
used by both golden spec files. Each fixture pair records the canonical
public download (URL + path in archive, or extraction commit hash for the
7800 table) as a `FixtureSource`, so the embedding could be replaced by
download-on-init without re-research. `golden.spec.ts` covers NES;
`golden-multisystem.spec.ts` covers C64, VIC-20, 7800, and 2600 -- together
they are the correctness gate.

## Design Decisions

- **No strategy pattern or mapper registry** for other systems (spec S9.4).
  A second exported function beside `toLumacodeOrder`, with the same shape,
  is the intended extension point if another system is ever added.
- **One shared Commodore permutation.**
  `COMMODORE_TO_LUMACODE = [0,6,2,4,9,11,12,3,8,14,15,7,5,10,13,1]` serves
  both C64 and VIC-20 -- verified byte-identical 16/16 against both golden
  pairs (`cjam.vpl` -> `C64.lmc`, `vice.vpl` -> `VIC20.lmc`). Splitting into
  two mapper functions is deferred until a future Commodore system's
  permutation diverges from this one.
- **Atari mapping is identity for both 7800 and 2600.** MARIA byte index
  equals `.pal` index for the 7800; TIA ignores the lowest index bit, so a
  768-byte 2600 source already contains duplicated adjacent pairs. A
  768-byte file without the duplicate property still converts, carrying a
  non-blocking `duplicatePairsBroken` notice rather than a parse error.
- **Boundary enforced by convention, not tooling**: no separate library, no
  ESLint rule. A library split isn't warranted at this size, so a grep for
  Angular package imports under this directory is the acceptance check.
- **Base64 fixtures duplicate the vendored corpus bytes** inside `.ts` files
  rather than being loaded as test assets. Duplication is accepted to avoid
  configuring binary asset loading in the Vitest/jsdom test runner; fixtures
  are generated mechanically from `fbx_pal/` and `lumacode/`, never
  hand-typed.
- **`toLumacodeOrder` never iterates hue 14 or 15.** Direct output-array
  generation (loop bounds 0..13) makes emitting a dropped `$xE`/`$xF` column
  impossible by construction, rather than filtering it out with a
  conditional.

## Why Sample Rate 4092 and Decimation 4

The `.lmc` first line is derived from console timing, not a free choice:
`sampleRate / decimation` must equal dots per scanline times lumacode
samples per pixel. The RT4K ADC oversamples each lumacode symbol
`decimation`-fold, and its sample rate is capped at 4095 (hence the UI's
1-4095 range). For the NES: 341 dots per scanline x 3 lumacode samples per
pixel x 4 = 4092. All 25 vendored presets obey this formula and all 12
NES-timing presets use exactly `4092 4`; the value depends on video chip
and TV norm only, never on palette content. The UI therefore treats it as
a derived default in an advanced section, not a required input.

Sources: junkerhq.net/xrgb `Optimal_timings` (341 dots per NES scanline);
c0pperdragon's LumaCode wiki, PPUdigitizer page (3 samples per NES pixel,
2 per C64 pixel); consolemods.org RT4K wiki (analog ADC tables corroborate
the dot counts: NES 3410/10 -> 341, C64 PAL 2016/4 -> 504).

Per-system header defaults, from `system.ts`'s `SYSTEMS` table:

| System  | PAL       | NTSC      |
| ------- | --------- | --------- |
| NES     | `4092 4`  | `4092 4`  |
| C64     | `4032 4`  | `3120 3`  |
| VIC-20  | `2272 4`  | `2080 4`  |
| 7800    | `3900 3`  | `3900 3`  |
| 2600    | `3648 4`  | `3648 4`  |

TV norm changes both numbers for C64 and VIC-20; the 7800 and 2600 headers
are norm-invariant in the corpus, which is why the norm toggle in the
options form applies only to the Commodore systems (see
`features/converter/README.md`).

The 7800's `3900 3` (1300 symbols/line) does not factor against a confirmed
MARIA dot-per-scanline count the way the NES and C64 derivations above do --
the value is copied from the official preset header rather than derived
from a sourced timing figure.

## Invariants

- Byte-identical reproduction of device-accepted `.lmc` files is the
  correctness oracle. RT4K parser tolerance is unknown and untested, so the
  serializer replicates official file structure exactly rather than relying
  on any assumed leniency. Whether the RT4K hardware accepts a generated
  Commodore or Atari `.lmc` file is likewise untested -- only NES output has
  a corpus of official presets device-verified as accepted. Byte-identity
  with an official preset is the strongest available proxy for the widened
  systems; loading a generated file on an actual device is the final gate,
  and it happens outside this test suite.
- Serializer hex case is per-system, not a global constant: uppercase only
  for `a2600` (matching `TIA_2600.lmc`, the one uppercase official preset),
  lowercase for every other system. Because RT4K parser tolerance is
  unknown, the byte-exact oracle rule forbids normalizing hex case to a
  single convention.
- `.lmc` entries 0-7 are always `000000`; their meaning is unconfirmed
  (presumed sync levels). They are hardcoded in `toLumacodeOrder`, never
  exposed as an option.
- All eleven golden-pair source `.pal` files have NES color `$0D` = `000000`, so the
  visibility fix (`color0d: 'visible'` forcing index 21 to `303030`) is
  provably the *only* difference between strict-mode output and the official
  files. `golden.spec.ts` asserts this directly rather than just asserting
  overall byte-identity.
- Index 21 = `8 + 14*0 + 13`, the arithmetic tying NES color `$0D` to its
  LumaCode position.
- `lumacode/DIAG.lmc` is the one NES-timing preset whose index 21 is not
  `303030` (it's `545454`, a diagnostic ramp). It has no `.pal` counterpart
  and must never be treated as a golden pair.
- `PC-10`'s golden counterpart lives at `lumacode/PC-10.lmc`, at the vendored
  corpus's top level -- not in `lumacode/NES Custom/` like the other ten.
- The four NES HDR pairs' source `.pal` files exist only inside
  `pal-fixtures.ts` (canonical download: `rt4k_nes_hdr_v2.zip`, see
  `GOLDEN_PAIRS`); `fbx_pal/` stays FBX-era only.
- The 7800 fixture is extracted from MAME `a7800p_colors` by script, not
  hand-typed; the golden spec asserts two structural properties of the
  official table as a transcription guard: hue-0 greys step by exactly
  `0x11`, and the hue-15 line equals the hue-1 line. The 2600 fixture is
  built from a Wikipedia TIA color table with duplicated adjacent pairs.
- The file-detection result union (entries, detected system,
  selectable systems, notices) lives beside `readPaletteFile` in
  `ConversionService`, not in `models.ts`: core types stay per-format and
  framework-free, while detection spans formats and encodes UI workflow.
- All three parsers share one error shape, `{ ok: false; reason; message:
  string }`, with `message` built in-parser; `ParseResult`'s success field
  is named `entries` (type stays `NesPalette`), matching `VplParseResult`
  and `AtariParseResult`.
  Error-shape unification is DL-003; the `entries` naming is DL-004.
- `TREBOR_COOL_PAL_B64` (a real-world Trebor-pack 7800 source) is a
  breadth fixture, not a golden pair: no official `.lmc` counterpart
  exists for any Trebor palette, so the assertion is parse-plus-convert
  success only, never byte-identity.
- TypeScript 6 compiler fallout in this module is fixed as type-level
  changes only (annotations, narrowing, satisfies); byte-identical
  output in golden.spec.ts and golden-multisystem.spec.ts gates every
  such fix.
