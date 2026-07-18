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
replicate the official preset format byte-for-byte, verified against a
vendored corpus of official `.lmc` presets.

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
2. **Adjust options** -- preset name, TV norm (C64/VIC-20 only), and for
   NES sources the `$0D` color handling (`visible` matches the official
   presets; `strict` keeps the source byte). Sample rate and decimation
   are derived per system and rarely need touching.
3. **Preview and download** the generated `.lmc`, then copy it to the
   RT4K SD card's palette directory.

To produce an optimized static build (deployable to any static host):

```bash
npm run build
# output in dist/nes-pal-to-lmc-converter/
```

## Architecture

The project has a hard boundary between conversion logic and UI:

```
src/app/
  core/palette/          Framework-free conversion core (plain TypeScript,
                         no Angular imports, no DOM): one parser and one
                         mapper per system, a shared .lmc serializer, and
                         the golden-test corpus.
  features/converter/    Angular UI layer: ConversionService (the only
                         caller of the core) plus container and
                         presentational components. UI state is three
                         signals; output is fully derived via computed().
```

Correctness is anchored to vendored reference data rather than a format
spec: every mapping is verified by golden tests
(`golden.spec.ts`, `golden-multisystem.spec.ts`) that reproduce official
`.lmc` presets byte-identically from their source palettes. The vendored
directories `fbx_pal/`, `vice_vpl/`, and `lumacode/` are that correctness
oracle and must never be edited.

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
