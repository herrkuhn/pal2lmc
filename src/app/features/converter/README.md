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

`ConversionService` also exposes two preview-only passthroughs so it stays
the sole core-crossing point for HDR preview math: `normalizedSdr(entries,
whiteLevel)` (delegates to `toNormalizedSdr`) and `hdrPreviewColors(entries,
whiteLevel)` (composes `toRelativeLinear` with `linearToSrgb` per channel,
returning extended-sRGB-encoded floats up to about 1.56). Both take the
`whiteLevel` from `PaletteFileResult.nesHdr`, an optional field set only in
the NES branch of `readPaletteFile` when `detectNesHdrHeadroom` (core)
returns non-null; the `hdrHeadroom` notice is present iff `nesHdr` is
present.

`HdrDisplayService` (`hdr-display.service.ts`), root-provided and injected
only by `ConverterPageComponent`: `displayIsHdr` wraps
`matchMedia('(dynamic-range: high)')` with a change listener; `gpu` is
`'unprobed' | 'probing' | GPUDevice | 'unavailable'`, moved off
`'unprobed'` only by `probe()` (called from `onFile` once a loaded file's
`nesHdr` is set). `probe()` is idempotent and guards every WebGPU API
access so jsdom specs need no stubbing -- a missing `navigator.gpu` or
`matchMedia` resolves to the SDR/unavailable defaults. `device.lost` flips
`gpu` back to `'unavailable'`.

`hdr-grid-renderer.ts` (`HdrGridRenderer`), constructed and owned by
`PaletteGridComponent`: an imperative class with no Angular or core
imports, taking a canvas, a `GPUDevice`, and an `onFailure` callback. It
uploads `hdrPreviewColors` output as a storage buffer and draws one
fullscreen triangle mapping the 16x4 cell layout; any WebGPU throw tears
the renderer down and calls `onFailure` exactly once. `computeCellRects`
is exported separately as a pure function, so cell/gap geometry is
jsdom-testable without a real GPU.

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
  `emphasisIgnored`, `ditherIgnored`, `duplicatePairsBroken`, `tagAbsent`,
  and `hdrHeadroom` -- one mechanism for every parser rather than each
  format inventing its own UI. `onDownload()` calls `conversionService.download`
  with the current `lmcText()` and palette name. The template renders
  `PaletteGridComponent`, `OptionsFormComponent`, and
  `OutputPreviewComponent` only while `paletteData()` is non-null; the
  `@else` branch is an init screen showing the drop-a-file message, the
  only copy of that text in the app (`OptionsFormComponent` has no
  equivalent hint). `parseError` and `notices` render outside this gate,
  so a failed parse -- including one after a prior success, since `onFile`
  resets `palette` to `null` on failure -- shows the error together with
  the init screen. When `result.nesHdr` is present, `onFile` also sets a
  `nesHdr` signal and calls `hdrDisplayService.probe()`; the `hdrHeadroom`
  entry in `NOTICE_TEXT` is phrased as a guess with an explicit escape
  hatch -- "This looks like an RT4K HDR-headroom palette (reference white
  below peak). The preview below simulates its HDR appearance where your
  browser and display allow it; the converted .lmc is unaffected. Switch
  the preview to 'File bytes' if this guess is wrong." -- rather than
  naming a specific HDR variant: the heuristic can false-positive on a
  deliberately dim custom palette, so generic wording that stays correct
  regardless of which, or whether any, known variant produced the file is
  preferable to hash-matching against known variant byte patterns. A
  `previewMode` signal (`null` means auto) and a computed `effectiveMode`
  implement the HDR/SDR-normalized/raw mode matrix (see HDR Preview
  below); both `nesHdr` and `previewMode` reset on every new file load,
  mirroring the `notices` reset. `onHdrRenderFailed()` downgrades
  `previewMode` to `'sdr-normalized'` for the current file only -- the
  next file load resets it to auto again.
- `file-drop.component.ts` -- hidden `<input type=file accept=".pal,.vpl">`
  plus a drag/drop zone; emits `fileSelected = output<File>()`. Never
  inspects the file extension itself -- `readPaletteFile`'s detection
  downstream is authoritative.
- `options-form.component.ts` -- reactive form (palette name; system radio
  group, always rendered, options limited to `selectableSystems()`,
  disabled when only one system is selectable; TV norm radio group, shown
  only for c64/vic20 via
  `showNormToggle()`; comment textarea; collapsed advanced panel
  holding sample rate, integer 1-4095, decimation, positive integer with a
  non-blocking warning outside 1-8, and a `samplingHint()` computed from
  `SYSTEMS[currentSystem()].samplingHint`, which names the fixed header
  tokens (anchor and, for NES, `nes=1`) the selected system emits. Sample rate
  and decimation are intentionally not `Validators.required` -- they are
  constants derived from console timing (see `core/palette/README.md`), so no
  required asterisk is shown; the integer/range validators still gate emission.
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
  16x16 with `$xx` MARIA-byte labels, one hue per row. In HDR-headroom
  mode it also accepts `mode`, `availableModes`, `clipped`, `hdrColors`,
  and `device` inputs and emits `modeChange`/`hdrRenderFailed` outputs --
  still `input()`/`output()` only, no injection; `GPUDevice` reaches it as
  a plain input, never via `inject()`, so the presentational boundary
  holds even for the WebGPU path. A segmented toggle above the grid
  renders only when `availableModes().length >= 2`; with no detection the
  component renders byte-for-byte today's template (no toggle, no
  canvas). See HDR Preview below for the mode semantics.
- `output-preview.component.ts` -- monospace `<pre>` preview of `lmcText()`;
  download button disabled while `lmcText()` is `null`.

## HDR Preview

Detection (`nes-hdr.ts`, core layer) only ever changes what the preview
*shows*; `entries`, `lmcText`, and the download are unaffected. `hdr` mode
reproduces the palette's brightness relative to its own reference white,
up to whatever headroom the display and browser offer -- browser extended
range is always relative to the display's own SDR white point, never an
absolute nit value, so this is not a colorimetric match to RT4K hardware
output. Three modes, picked by `effectiveMode` in
`converter-page.component.ts`:

| Detection | GPUDevice + `displayIsHdr()` | `effectiveMode` (auto) | `availableModes`               |
| --------- | ---------------------------- | ----------------------- | ------------------------------- |
| none      | --                            | `raw`                    | `[]` (no toggle)                 |
| yes       | no                            | `sdr-normalized`         | `[sdr-normalized, raw]`          |
| yes       | yes                           | `hdr`                    | `[hdr, sdr-normalized, raw]`     |

`previewMode` is `null` (auto) unless the user picks a mode via the
toggle; an explicit choice survives a `displayIsHdr` change (e.g. a
monitor swap) but resets to `null` on a new file load -- the same
reset-on-new-file lifecycle as `OptionsFormComponent`'s `userComment`. The
`hdr` option is hidden, not shown-disabled, when unavailable: extended
range rendered on an SDR display clamps to output visually identical to
`sdr-normalized`, so a visible-but-inert entry would only mislead.

Everything up to "encoded colors + cell geometry" is pure and covered by
jsdom specs with zero WebGPU/`matchMedia` stubbing (`hdrPreviewColors`,
`normalizedSdr`, `computeCellRects`); the actual `HdrGridRenderer` draw
calls are WebGPU-only and, like the rest of this layer's real rendering,
verified by manual/recorded smoke rather than the automated suite.

## Design Decisions

- **State lives in signals only, no store library**: `palette`,
  `options`, `parseError`, `notices`, and `selectableSystems`. `lmcText`
  and `paletteData` are fully derived via `computed()`, so they cannot go
  stale relative to the signals above; a store would create a second
  source of truth.
- **Presentational children own no state and never import the core.** The
  container is the only file with `inject(ConversionService)`, keeping the
  Angular-to-core boundary at exactly one crossing point. `HdrDisplayService`
  extends this rule rather than breaking it: it is also injected only by
  the container, never by `PaletteGridComponent`, which receives `GPUDevice`
  and encoded colors as plain inputs.
- **HDR preview colors are encoded on the CPU in `ConversionService`, not
  in the WGSL shader.** Duplicating the sRGB transfer function in a second
  language would put it beyond unit-test reach; encoding in the service
  passthrough means everything up to "encoded colors + cell geometry" is
  pure and jsdom-testable, and `HdrGridRenderer` touches only WebGPU APIs
  -- pinning the untestable seam as narrowly as possible.
- **GPU capability is probed lazily, on first HDR-headroom load, not at
  app start.** Adapter/device acquisition costs work that most users --
  anyone who never loads a headroom palette -- would never benefit from.
- **No browser-version gating for the Chrome < 129 `toneMapping` gap in
  `HdrDisplayService.probe()`.** There is no direct feature-detection API
  for extended tone-mapping support, and sniffing the user agent to
  approximate one would be brittle; the failure mode is harmless anyway --
  an engine that lacks the feature silently clamps HDR output to
  something visually identical to `sdr-normalized`.
- **The swatch grid stays a CSS grid; the WebGPU canvas is a color-only
  underlay behind it.** `PaletteGridComponent`'s existing DOM grid keeps
  layout, labels, and hue/index text; the canvas draws only the 64
  background colors atop the same `computeCellRects` geometry, so raw
  mode (no canvas) renders the identical DOM byte-for-byte to today's
  template and switching modes never touches layout or labels, only the
  color source.
- **Detection wiring (`conversion.service.ts`), preview-mode state
  (`converter-page.component.ts`), and the WebGPU underlay
  (`palette-grid.component.ts`) land as one unit of work, not three.**
  All three touch the same disjoint set of files and nothing outside it,
  so grouping them keeps each unit of work's file ownership from
  overlapping any other; the notice-text, then SDR-normalized fallback,
  then underlay ordering inside that unit still ships each capability
  behind a green test suite before the next lands.
- **`OptionsFormComponent` distinguishes `comment: undefined` from
  `comment: ''`.** Undefined means "generate the default S3.3 comment
  block"; a string means the user edited or cleared it.
- **No NES-specific fieldset.** NES color `$0D` passes through like every
  other entry, and the mapper fixes LumaCode index 35 black because the
  PPUdigitizer folds `$1D` and every `$xE`/`$xF` into that word -- both are
  device facts, not user preferences, so the form offers no NES-specific
  controls.
- **Header re-seed mirrors the `userComment` precedent.** A private
  `headerDirty` flag in `options-form.component.ts` gates re-seeding
  `sampleRate`/`decimation` on a system or norm switch, the same
  dirty-tracking shape already used for the comment textarea -- silently
  overwriting a user-set header value on a switch would lose work the
  same way overwriting an in-progress comment edit would. The header
  line's anchor and protocol tokens are derived from `SYSTEMS` for the
  selected system/norm, not form fields, so a hand-edited sample rate
  still ships the system's anchor.
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
- `nesHdr` and the `hdrHeadroom` notice are set together or never (asserted
  both ways in `conversion.service.spec.ts`); the `.vpl` and 768-byte
  branches never set either -- only the NES branch of `readPaletteFile`
  runs `detectNesHdrHeadroom`.
- A 1536-byte file's HDR detection runs on block 0 (the base palette),
  the same block used for conversion; the discarded emphasis blocks play
  no part in detection, matching the existing `emphasisIgnored` behavior.
