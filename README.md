# RetroTINK-4K LumaCode Palette Converter

A browser-only Angular app that converts emulator palette files into
RetroTINK-4K LumaCode palette presets (`.lmc`). Drop in a palette file,
pick your options, and download a preset ready to copy onto the RT4K's
SD card. Everything runs client-side -- no server, no upload.

Supported conversions:

| System               | Input format                                | Output           |
| -------------------- | ------------------------------------------- | ---------------- |
| NES                  | `.pal` (192 or 1536 bytes, NES PPU order)   | 64-entry `.lmc`  |
| Commodore 64, VIC-20 | VICE `.vpl` (16-color text format)          | 16-entry `.lmc`  |
| Atari 7800, 2600     | `.pal` (768 bytes, 256 RGB entries)         | 256-entry `.lmc` |

The conversion is a re-indexing, not a reformat: each system's palette
entries must be reordered into LumaCode index order, and a naive 1:1 byte
dump parses on the RT4K but renders wrong colors. Generated files
replicate the official preset format byte-for-byte, verified by a golden
test suite against official `.lmc` presets.

Some NES palettes are authored for the RT4K's HDR headroom feature: the
file's colors look uniformly dim in an ordinary viewer because reference
white is scaled below peak brightness on purpose. The app recognizes
these palettes automatically, shows a notice explaining the guess, and
previews them at their intended relative brightness -- in HDR on a
supporting browser and display, normalized against SDR white otherwise,
or as plain file bytes if you'd rather see exactly what's on disk. The HDR
preview tracks your display's own brightness headroom, not an absolute
brightness value, so it will not look identical to the RT4K's own output
on every screen. The conversion output is identical either way; the
preview mode only changes what you see before downloading.

## Installation

Requires [Node.js](https://nodejs.org/) 20.19+ (Node 24 recommended) and
npm. Then:

```bash
git clone <repository-url>
cd nes-pal-to-lmc-converter
npm ci
```

`package.json` pins the exact npm release via the `packageManager` field;
run `corepack enable` if you want that pin honored automatically.

## Usage

Start the development server:

```bash
npm start
```

Open `http://localhost:4200/`, then:

1. **Drop or select a palette file** (`.pal` or `.vpl`). The app detects
   the system from the file's size and content; where detection is
   ambiguous (e.g. 7800 vs. 2600) it shows a notice and lets you
   override the system by hand.
2. **Adjust options** -- preset name and TV norm (C64/VIC-20 only).
   Sample rate and decimation are derived per system and rarely need
   touching.
3. **Preview and download** the generated `.lmc`, then copy it to the
   RT4K SD card's palette directory. If the app recognizes an HDR-headroom
   NES palette, a toggle above the preview lets you switch between HDR,
   normalized-SDR, and file-bytes views.

To produce an optimized static build (deployable to any static host):

```bash
npm run build
# output in dist/nes-pal-to-lmc-converter/
```

## Deployment

The app is published to GitHub Pages via GitHub Actions at
`https://herrkuhn.github.io/pal2lmc/`. Every push to `main` and every pull
request runs the test suite and a production build; every green push to
`main` deploys automatically. Compiled output never enters version
control -- the deploy job builds fresh from source and publishes the
result as a GitHub Actions artifact.

## Architecture

The project has a hard boundary between conversion logic and UI:

```
src/app/
  core/palette/          Framework-free conversion core (plain TypeScript,
                         no Angular imports, no DOM): one parser and one
                         mapper per system, a shared .lmc serializer, NES
                         HDR-headroom detection and preview math, and the
                         golden-test fixtures.
  features/converter/    Angular UI layer: ConversionService (the only
                         caller of the core) plus container and
                         presentational components, an HDR display-
                         capability service, and a WebGPU preview
                         renderer. UI state lives in signals; output is
                         fully derived via computed().
```

Correctness is anchored to reference data rather than a format spec:
every mapping is verified by golden tests (`golden.spec.ts`,
`golden-multisystem.spec.ts`) that reproduce official `.lmc` presets
byte-identically from their source palettes. The reference data is
committed as fixtures in `src/app/core/palette/fixtures/`, so the full
test suite runs on any fresh clone.

For the full details, see the per-layer docs:

- [`src/app/core/palette/README.md`](src/app/core/palette/README.md) --
  per-system index mappings, `.lmc` format rules, sample-rate/decimation
  derivation, fixture provenance, and invariants.
- [`src/app/features/converter/README.md`](src/app/features/converter/README.md) --
  UI structure, system detection, and options behavior.

## Development

Generated with Angular CLI (`ng new --directory=.`); currently on
Angular 22 with the Vitest/jsdom test runner (no Karma, no browser
binary required).

```bash
npm start          # dev server on http://localhost:4200/
npm test           # run the unit + golden test suites
npm run build      # production build into dist/
```

`ng e2e` has no framework configured.
