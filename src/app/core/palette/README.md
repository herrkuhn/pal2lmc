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

Framework-free by convention: nothing here imports Angular
packages or touches the DOM. `ConversionService` in
`src/app/features/converter/` is the only caller.

## Architecture

Parsers and mappers are sibling pure functions per system (no strategy
pattern or mapper registry):

```
parsePal(bytes) -> ParseResult                    # pal-parser.ts, NES
parseVpl(text) -> VplParseResult                  # vpl-parser.ts, C64/VIC-20
parseAtariPal(bytes) -> AtariParseResult          # atari-pal-parser.ts, 7800/2600

toLumacodeOrder(palette) -> Rgb[]                 # lumacode-mapper.ts, NES
commodoreToLumacodeOrder(entries) -> Rgb[]        # commodore-mapper.ts, C64/VIC-20
atariToLumacodeOrder(entries) -> Rgb[]            # atari-mapper.ts, 7800/2600

serializeLmc(entries, opts) -> string             # lmc-serializer.ts, all systems

detectNesHdrHeadroom(palette) -> NesHdrDetection | null       # nes-hdr.ts, NES only
toRelativeLinear(palette, whiteLevel) -> LinearRgb[]          # nes-hdr.ts, HDR preview math
toNormalizedSdr(palette, whiteLevel) -> { entries; clipped }  # nes-hdr.ts, SDR-normalized preview
srgbToLinear(encoded) / linearToSrgb(linear)                  # nes-hdr.ts, shared sRGB transfer pair
```

`nes-hdr.ts` detects NES HDR-headroom palettes -- plain 8-bit sRGB `.pal`
files with no marker or metadata, scaled so the hottest color sits at
`1.0` and reference white sits below it -- and derives the preview math
that reconstructs their intended relative brightness. `ConversionService`
in `src/app/features/converter/` is the sole caller; detection and preview
colors never reach `convert()`, `toLumacodeOrder`, or `serializeLmc`.
The reconstruction is relative to the palette's own reference white and
the display's own SDR white point, not an absolute nit value -- correct
relative brightness up to whatever headroom the browser and display
offer, not a colorimetric match to RT4K hardware output.

`system.ts` holds the `SYSTEMS` table, the single source of per-system facts:
header defaults per TV norm (sample rate, decimation, the word-phase anchor,
and the sync width / word start pair, `syncw`/`wofs`), any protocol tokens
appended after the anchor (e.g. NES's `nes=1`), hex case, entry count, preset
comment wording, and the sampling-rate hint shown in the UI. `serializeLmc`
reads hex case, comment wording, anchor, protocol tokens, `syncw`, and
`wofs` from this table rather than branching on `SystemId` itself.

`fixtures/` holds the golden-test corpus, base64-embedded rather than loaded
as test assets: `pal-fixtures.ts` holds the eleven NES source `.pal`
files (seven FBX-era palettes, four NES HDR palettes),
`vpl-fixtures.ts` the two VICE sources, and
`atari-fixtures.ts` the constructed 7800 and 2600 source palettes
(MAME `a7800p_colors` extracted by script, a Wikipedia 2600 table with
duplicated adjacent pairs -- see Invariants), including the matching
official 7800 and 2600 `.lmc` presets. `lmc-fixtures.ts` and
`lmc-multisystem-fixtures.ts` hold the matching official NES and
C64/VIC-20 `.lmc` presets respectively;
`spec-helpers.ts` holds shared test utilities (`dataLinesOf` and friends)
used by both golden spec files. Each fixture pair records the canonical
public download (URL + path in archive, or extraction commit hash for the
7800 table) as a `FixtureSource`, so the embedding could be replaced by
download-on-init without re-research. `golden.spec.ts` covers NES;
`golden-multisystem.spec.ts` covers C64, VIC-20, 7800, and 2600 -- together
they are the correctness gate.

## Design Decisions

- **No strategy pattern or mapper registry** for other systems.
  A second exported function beside `toLumacodeOrder`, with the same shape,
  is the intended extension point if another system is ever added.
- **NES HDR-headroom detection is heuristic, not authoritative, and NES-only.**
  `detectNesHdrHeadroom` classifies by a white/peak ratio
  (`HEADROOM_RATIO_MAX = 0.85`) behind a `SATURATION_FLOOR = 240` guard on
  the peak channel -- every vendored preset, HDR and FBX-era alike, peaks
  at exactly 255, so 240 is 255 minus about 6% slack for rounded or
  rescaled exports; the floor also rejects flat/dim palettes outright and
  keeps the ratio's division from a zero peak. Reference white is the max
  of indices `$20` AND `$30`, not either alone, so a palette with only one
  tinted reference-white entry can't skew the ratio; a white reading of 0
  is rejected as a garbage reference point, not headroom. The vendored
  corpus splits at ratios 0.635-0.769 for the four HDR variants (HDR Raw,
  Soft Clamp, Medium Clamp, Sony Decoder) versus exactly 1.0 for every
  FBX-era preset, so 0.85 clears the highest HDR ratio (0.769) by 0.081
  while sitting 0.15 below the FBX-era floor. Detection is NES-only
  because only the NES defines reference-white indices (`$20`/`$30`) to
  anchor the ratio; a future non-NES headroom convention is a sibling pure
  function beside `detectNesHdrHeadroom`, the same no-strategy-pattern
  extension point as `toLumacodeOrder`.
- **A deliberately dim custom palette can false-positive the HDR
  heuristic.** Detection therefore only ever drives a notice and a preview
  toggle in `features/converter/`, never `convert()`'s output; the raw
  (file-bytes) preview mode always remains available as the escape hatch.
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
- **Fixture bytes are base64-embedded** inside `.ts` files rather than
  loaded as test assets. Embedding is accepted to avoid configuring binary
  asset loading in the Vitest/jsdom test runner; fixtures are generated
  mechanically from the canonical downloads recorded in each
  `FixtureSource`, never hand-typed. Every `.lmc` fixture text is copied
  byte-exact from the RT4K firmware 1.87.3 release archive, the origin of
  the golden corpus.
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
pixel x 4 = 4092. All 30 official presets surveyed obey this formula and
all 13 NES-timing presets use exactly `4092 4`; the value depends on video chip
and TV norm only, never on palette content. The UI therefore treats it as
a derived default in an advanced section, not a required input.

Sources: junkerhq.net/xrgb `Optimal_timings` (341 dots per NES scanline);
c0pperdragon's LumaCode wiki, PPUdigitizer page (3 samples per NES pixel,
2 per C64 pixel); consolemods.org RT4K wiki (analog ADC tables corroborate
the dot counts: NES 3410/10 -> 341, C64 PAL 2016/4 -> 504).

The header line is `rate dec anchor=N`, then any protocol tokens for the
system, then `syncw=N wofs=M`, single-space separated (e.g.
`4092 4 anchor=1 nes=1 syncw=300 wofs=10` for NES). `anchor` is a word-phase
constant measured per system on the reference generator, norm-keyed only for
the VIC-20 (PAL `4`, NTSC `0`); every other system's anchor is norm-invariant.
`syncw` and `wofs` are the system's sync width and word start relative to the
sync, measured on c0pperdragon's LumaCode reference generator -- the RT4K
uses them to align words automatically each time it locks, falling back to
`anchor` if that measurement fails. Every token is emitted even when zero or
negative, because byte-identity with the official files is the correctness
oracle: the official VIC-20 NTSC preset spells `anchor=0` explicitly, and
several presets spell `wofs=-2`. `nes=1` is the NES protocol token: firmware
that recognizes it renders the PPU emphasis words (raw 0-7) as a color
tint, while firmware that does not recognize the token ignores it. Generated presets reproduce
the header grammar of RT4K firmware 1.87.3 and target that firmware or
later, with no legacy header mode; the official presets state that older
firmware ignores `syncw` and `wofs`, so the files load there as well, and a
user who wants the shorter header on such firmware can hand-trim the two
trailing tokens.

Per-system header defaults, from `system.ts`'s `SYSTEMS` table:

| System  | PAL                                        | NTSC                                       |
| ------- | ------------------------------------------- | ------------------------------------------- |
| NES     | `4092 4 anchor=1 nes=1 syncw=300 wofs=10`   | `4092 4 anchor=1 nes=1 syncw=300 wofs=10`   |
| C64     | `4032 4 anchor=1 syncw=296 wofs=-2`         | `3120 3 anchor=1 syncw=222 wofs=-2`         |
| VIC-20  | `2272 4 anchor=4 syncw=128 wofs=6`          | `2080 4 anchor=0 syncw=128 wofs=-2`         |
| 7800    | `4086 3 anchor=9 syncw=126 wofs=4`          | `4086 3 anchor=9 syncw=126 wofs=4`          |
| 2600    | `3648 4 anchor=7 syncw=224 wofs=-2`         | `3648 4 anchor=7 syncw=224 wofs=-2`         |

TV norm changes rate and decimation for both Commodore systems, the C64's
`syncw` (`296` PAL / `222` NTSC), and the VIC-20's `anchor` and `wofs` (`4`
and `6` PAL / `0` and `-2` NTSC); the C64's `anchor`/`wofs` and the VIC-20's
`syncw` stay fixed across norms. The 7800 and 2600 headers are entirely
norm-invariant in the official presets, which is why the norm toggle in the
options form applies only to the Commodore systems (see
`features/converter/README.md`).

The 7800's `4086 3`: the MARIA generator draws 341 dots per scanline at 4
samples per dot with 2 symbols skipped at `x=0`, giving 1362 symbols per
line; oversampled 3x = 4086 / 3, matching both official MARIA presets.

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
- `.lmc` entries 0-7 are always `000000` in every generated file, hardcoded
  in `toLumacodeOrder` (and the other mappers) and never exposed as an
  option. For NES, `nes=1` identifies these words to firmware that
  recognizes the token as the PPU emphasis command words, rendered as a
  color tint rather than treated as palette data; for every other system
  their meaning stays unconfirmed (presumed sync levels).
- Every NES entry, index 21 (`$0D` = `8 + 14*0 + 13`) included, passes
  through unchanged and matches the official files byte-for-byte;
  `golden.spec.ts` asserts full header-and-data-line identity against the
  official presets.
- Index 35 (`8 + 14*1 + 13`, the `$1D` slot) is always `000000`: the
  PPUdigitizer folds `$1D` and every `$xE`/`$xF` into raw word 35, so the
  RT4K renders it as `$0F`, the black most games use. `toLumacodeOrder`
  forces it regardless of the source palette; the PC-10 pair is the one
  vendored source with a non-black `$1D`, so it is the pair that exercises
  the fold.
- `DIAG.lmc` is an identity ramp (index 21 `545454`, index 35 `8c8c8c`)
  that omits `nes=1` and has no `.pal` counterpart; the generic top-level
  `NES.lmc` has no vendored source palette producing its data either.
  Neither is a golden pair.
- The four NES HDR pairs' source `.pal` files have no standalone file
  counterpart; they exist only inside `pal-fixtures.ts` (canonical
  download: `rt4k_nes_hdr_v2.zip`, see `GOLDEN_PAIRS`).
- Their `whiteLevel` (max channel of index `$20`/`$30`) is 162 (HDR Raw),
  180 (Soft Clamp), 196 (Medium Clamp), and 189 (Sony Decoder) against a
  peak of 255 -- ratios 0.635, 0.706, 0.769, 0.741, all at or below
  `HEADROOM_RATIO_MAX`. `toRelativeLinear`/`toNormalizedSdr` treat
  `whiteLevel` as the point that reconstructs to `1.0` linear (SDR white),
  so HDR Raw's `$22` blue (source byte 255) reconstructs to about 2.77
  linear -- values above 1.0 are the "headroom" the preview renders.
- `srgbToLinear`/`linearToSrgb` extend the standard sRGB piecewise curve
  beyond 1.0 by continuing the power segment rather than clamping, so
  values above 1.0 linear round-trip within `1e-6`;
  `ConversionService.hdrPreviewColors` reuses this same pair rather than
  duplicating the transfer function in the WebGPU shader.
- The 7800 fixture is extracted from MAME `a7800p_colors` by script, not
  hand-typed; the golden spec asserts two structural properties of the
  official table as a transcription guard: hue-0 greys step by exactly
  `0x11`, and the hue-15 line equals the hue-1 line. The 2600 fixture is
  built from a Wikipedia TIA color table with duplicated adjacent pairs.
- The file-detection result union (entries, detected system,
  selectable systems, notices) lives beside `readPaletteFile` in
  `ConversionService`, not in `models.ts`: core types stay per-format and
  framework-free, while detection spans formats and encodes UI workflow.
  `PaletteFileResult.nesHdr` follows this same precedent -- it sits beside
  `readPaletteFile`, not in `models.ts`, even though `detectNesHdrHeadroom`
  itself is core, framework-free, palette-content domain knowledge.
- All three parsers share one error shape, `{ ok: false; reason; message:
  string }`, with `message` built in-parser; `ParseResult`'s success field
  is named `entries` (type stays `NesPalette`), matching `VplParseResult`
  and `AtariParseResult`.
- `TREBOR_COOL_PAL_B64` (a real-world Trebor-pack 7800 source) is a
  breadth fixture, not a golden pair: no official `.lmc` counterpart
  exists for any Trebor palette, so the assertion is parse-plus-convert
  success only, never byte-identity.
- TypeScript 6 compiler fallout in this module is fixed as type-level
  changes only (annotations, narrowing, satisfies); byte-identical
  output in golden.spec.ts and golden-multisystem.spec.ts gates every
  such fix.
- Every `.lmc` fixture template literal carries no CR, no backtick, no
  `${`, and no backslash: each embeds an official preset's bytes verbatim
  inside a JavaScript template literal, and any one of those four byte
  sequences would change the embedded string, terminate the literal
  early, or open an unwanted interpolation, so the fixture would silently
  diverge from the archive it is supposed to reproduce while every
  line-based check still passes.
- Every `.lmc` fixture text is a mechanical whole-file copy of its
  source in the corpus archive: a one-off script writes the archive
  bytes into the template literal unedited, comments and all, so no
  fixture text here is ever hand-typed.
