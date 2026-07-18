# features/converter

## Overview

Angular UI layer for the palette-to-`.lmc` converter: a drag/drop file
input accepting `.pal` and `.vpl` sources, a system-aware palette preview
grid, an options form with a system selector, and an output preview with
download. All conversion logic lives in `src/app/core/palette/`; nothing in
this directory imports the core's parse, map, or serialize functions
directly -- `ConversionService` is the sole crossing point into the
framework-free core.

## Architecture

`ConverterPageComponent` is the sole container: it owns state signals
(`palette`, `options`, `parseError`, `notices`, `selectableSystems`),
derives `paletteData`/`lmcText` via `computed()`, and is the only component with
`inject(ConversionService)`. `FileDropComponent`, `PaletteGridComponent`,
`OptionsFormComponent`, and `OutputPreviewComponent` are presentational --
`input()`/`output()` only, no core imports, no service injection.

```
FileDropComponent --(File)--> ConverterPageComponent --(Rgb[])--> PaletteGridComponent
                                       |
                                       +--(LmcOptions)--> OptionsFormComponent --(LmcOptions)-->
                                       |
                                       +--(lmcText)--> OutputPreviewComponent --(download)-->
```

`ConversionService` (`conversion.service.ts`):

- `readPaletteFile(file)` -- branches on the file's extension and byte
  length, then dispatches to the matching core parser:
  - `.vpl` extension (case-insensitive) -> `parseVpl`. A `# TYPE:` tag
    (exact-token match: `VICII` -> c64, `VIC` -> vic20, since `VIC` is a
    prefix of `VICII`) pre-selects the system; a tagless file defaults to
    c64 with a `tagAbsent` notice.
  - 192 or 1536 bytes -> `parsePal` (NES).
  - 768 bytes -> `parseAtariPal`. All 128 adjacent byte-pairs duplicated
    pre-selects a2600; otherwise a7800 with a `duplicatePairsBroken`
    notice. The mapper is identity either way, so misdetection changes
    only header, hex case, and comment -- the user can flip the system
    selector rather than facing a modal choice.
  - any other size -> `{ ok: false, message }` naming every accepted
    input (192, 768, or 1536 bytes, or a `.vpl` file) and the actual size.
  Returns a `PaletteFileResult` carrying `entries`, the detected `system`,
  `selectableSystems` (the systems the UI offers for that input kind), an
  optional `paletteName` from the `.vpl` `# NAME:` tag, and a `notices`
  array.
- `convert(entries, options)` -- a plain `switch` on `options.system`
  (default `nes`; no mapper registry) composing the matching mapper
  (`toLumacodeOrder`, `commodoreToLumacodeOrder`, or
  `atariToLumacodeOrder`) with `serializeLmc`.
- `download(text, baseName)` -- creates a `Blob`, an object URL, and a
  programmatic anchor click to trigger a browser download; the object URL is
  revoked immediately after.

`sanitizeFilename` is exported alongside the service as a plain function. It
is a download-filesystem courtesy, not a device requirement: official `.lmc`
filenames use spaces and parentheses freely, so only characters unsafe for
common filesystems are replaced with `_`.

## Components

- `converter-page.component.ts` -- container. `onFile()` awaits
  `readPaletteFile`; on success stores `entries`, `notices`,
  `selectableSystems`, and seeds `options.system`/`tvNorm`/`sampleRate`/
  `decimation` from `defaultOptionsFor(result.system, 'pal')` plus
  `paletteName`/`sourceFileName` from the result and the dropped file's
  name; on failure sets `parseError` to `"<filename>": <result.message>`,
  where `message` names every accepted input (192, 768, or 1536 bytes, or
  a `.vpl` file) and the actual size. Renders one `<p class="notice">` per
  entry in `notices()`, text keyed by a `NOTICE_TEXT` lookup covering
  `emphasisIgnored`, `ditherIgnored`, `duplicatePairsBroken`, and
  `tagAbsent` -- one mechanism for every parser rather than each format
  inventing its own UI. `onDownload()` calls `conversionService.download`
  with the current `lmcText()` and palette name. The template renders
  `PaletteGridComponent`, `OptionsFormComponent`, and
  `OutputPreviewComponent` only while `paletteData()` is non-null; the
  `@else` branch is an init screen showing the drop-a-file message, the
  only copy of that text in the app (`OptionsFormComponent` has no
  equivalent hint). `parseError` and `notices` render outside this gate,
  so a failed parse -- including one after a prior success, since `onFile`
  resets `palette` to `null` on failure -- shows the error together with
  the init screen.
- `file-drop.component.ts` -- hidden `<input type=file accept=".pal,.vpl">`
  plus a drag/drop zone; emits `fileSelected = output<File>()`. Never
  inspects the file extension itself -- `readPaletteFile`'s detection
  downstream is authoritative.
- `options-form.component.ts` -- reactive form (palette name; system radio
  group, always rendered, options limited to `selectableSystems()`,
  disabled when only one system is selectable; TV norm radio group, shown
  only for c64/vic20 via
  `showNormToggle()`; `$0D` radio, `visible` default, shown only when the
  current system is `nes`; comment textarea; collapsed advanced panel
  holding sample rate, integer 1-4095, decimation, positive integer with a
  non-blocking warning outside 1-8, and a `samplingHint()` computed from
  `SYSTEMS[currentSystem()].samplingHint`). Sample rate and decimation are
  intentionally not `Validators.required` -- they are constants derived
  from console timing (see `core/palette/README.md`), so no required
  asterisk is shown; the integer/range validators still gate emission.
  Emits `optionsChange` only while the form is valid (`form.valueChanges`
  gated on `form.valid`). Tracks the comment textarea in a private
  `userComment` field updated only by the comment control's own
  `valueChanges`, so editing an unrelated field never overwrites it with
  `''`. Loading a new file (`sourceFileName` change) resets `userComment`
  to `undefined` alongside `headerDirty`, so a fresh file always starts
  with the auto-generated comment. Both the container's `comment: undefined`
  seed (`converter-page.component.ts`) and this private-field reset are
  required: `emitChange` re-emits `userComment` on every change, so the
  container's seed alone would be immediately overwritten by a stale
  private copy. A private `headerDirty` flag, set only by the sample-rate/
  decimation controls' own `valueChanges`, mirrors the `userComment`
  precedent: on a genuine system or norm transition the form re-seeds
  `sampleRate`/`decimation` from `headerFor(system, tvNorm)`, but only
  while `headerDirty` is `false`, so a switch never clobbers an
  in-progress header edit. Loading a new file (`sourceFileName` change)
  clears `headerDirty` so the freshly seeded per-system defaults take
  effect.
- `palette-grid.component.ts` -- swatch grid keyed by a `system` input,
  always in **source order**, never LumaCode order -- the human sanity
  check for byte-order bugs against the source file or emulator palette
  viewer: `nes` is 4x16 with `$xx` PPU-order labels; `c64`/`vic20` is one
  row of 16 with Commodore color numbers and names; `a7800`/`a2600` is
  16x16 with `$xx` MARIA-byte labels, one hue per row.
- `output-preview.component.ts` -- monospace `<pre>` preview of `lmcText()`;
  download button disabled while `lmcText()` is `null`.

## Design Decisions

- **State lives in signals only, no store library**: `palette`,
  `options`, `parseError`, `notices`, and `selectableSystems`. `lmcText`
  and `paletteData` are fully derived via `computed()`, so they cannot go
  stale relative to the signals above; a store would create a second
  source of truth.
- **Presentational children own no state and never import the core.** The
  container is the only file with `inject(ConversionService)`, keeping the
  Angular-to-core boundary at exactly one crossing point.
- **`OptionsFormComponent` distinguishes `comment: undefined` from
  `comment: ''`.** Undefined means "generate the default S3.3 comment
  block"; a string means the user edited or cleared it.
- **`$0D` radio is shown only for `nes`.** Remapping NES color `$0D` to
  `303030` (index 21) so cursor glyphs stay visible on black is an official
  `.lmc` preset convention, not a firmware requirement enforced by the
  device -- the other four systems have no `$0D`-equivalent index and no
  corresponding convention, so the fieldset does not generalize to them.
- **Header re-seed mirrors the `userComment` precedent.** A private
  `headerDirty` flag in `options-form.component.ts` gates re-seeding
  `sampleRate`/`decimation` on a system or norm switch, the same
  dirty-tracking shape already used for the comment textarea -- silently
  overwriting a user-set header value on a switch would lose work the
  same way overwriting an in-progress comment edit would.
- **768-byte detection is a heuristic with a user override, not a modal.**
  Because the Atari mapping is identity for both 7800 and 2600,
  misdetecting a 768-byte source only changes header, hex case, and
  comment -- harmless enough that the all-pairs-duplicate heuristic plus a
  system-selector override beats forcing a choice on every 768-byte file.
- **Filename sanitization is a download-filesystem courtesy, not a device
  requirement.** Official `.lmc` filenames use spaces and parentheses
  freely; `sanitizeFilename` only replaces characters outside
  `[A-Za-z0-9 ()_-]`.
- **The page gate is the only init-state definition.** `ConverterPageComponent`'s
  `@if (paletteData() !== null)` block is the sole source of truth for
  whether the app is in its pre-load state. Behind the gate,
  `OptionsFormComponent` and `OutputPreviewComponent` only ever receive
  loaded-file state: `lmcText()` is a string whenever `palette()` is
  non-null. `PaletteGridComponent`'s own `@if (palette())` null guard and
  `OutputPreviewComponent`'s disabled-while-null download button become
  defense in depth behind that gate rather than load-bearing. Returning to
  the init screen (a failed parse, including one after a prior success)
  destroys and recreates `OptionsFormComponent`, resetting its in-progress
  `headerDirty`/`userComment` bookkeeping -- acceptable because a new file
  load re-seeds the header anyway.
- **Tests run under Vitest/jsdom, not a real browser** (no Karma/Chrome in
  this environment). Specs stub `URL.createObjectURL`/`revokeObjectURL` and
  `anchor.click()`, since jsdom implements neither. This covers unit and
  component logic; real rendering and the RT4K hardware check (accepting a
  generated `.lmc` file on an actual device) remain manual verification steps
  outside this test suite.

## Invariants

- `PaletteGridComponent` renders the palette in source order, keyed by the
  `system` input -- never LumaCode order. NES uses PPU order with `$xx`
  labels; it should visually match the source emulator's own palette
  viewer.
- A 1536-byte `.pal` file converts using only block 0; `ConverterPageComponent`
  shows a notice (`emphasisIgnored`) rather than converting or warning about
  the discarded emphasis blocks in any other way.
- The wrong-size/wrong-format error message names every accepted input
  (192, 768, or 1536 bytes, or a `.vpl` file) alongside the actual size, so
  a user never has to guess which formats are supported.
- New files always load seeded with `tvNorm: 'pal'` (`defaultOptionsFor(result.system, 'pal')`
  in `onFile`), regardless of any norm the user previously selected for a
  prior file -- PAL is the more common source for VICE `.vpl` exports, and
  the norm toggle remains available to switch immediately after load.
