import { Component, computed, inject, signal } from '@angular/core';
import { DEFAULT_OPTIONS, LmcOptions, Rgb } from '../../core/palette/models';
import { NesHdrDetection } from '../../core/palette/nes-hdr';
import { ConversionService, ParserNotice } from './conversion.service';
import { defaultOptionsFor, SystemId } from '../../core/palette/system';
import { FileDropComponent } from './file-drop.component';
import { OptionsFormComponent } from './options-form.component';
import { PaletteGridComponent, PreviewMode } from './palette-grid.component';
import { OutputPreviewComponent } from './output-preview.component';
import { HdrDisplayService } from './hdr-display.service';

function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// One notice mechanism for every parser (shares the emphasisIgnored
// pattern rather than each format inventing its own UI).
const NOTICE_TEXT: Record<ParserNotice, string> = {
  emphasisIgnored:
    'This file includes NES color-emphasis data, which is ignored; only the base palette was converted.',
  ditherIgnored: 'This .vpl file includes a legacy dither column, which is ignored.',
  duplicatePairsBroken:
    "This file's adjacent color pairs aren't all duplicated, so 7800 was guessed over 2600 -- switch the system below if that's wrong.",
  tagAbsent:
    "This .vpl file has no TYPE tag, so C64 was guessed -- switch the system below if that's wrong.",
  hdrHeadroom:
    "This looks like an RT4K HDR-headroom palette (reference white below peak). The preview below simulates its HDR appearance where your browser and display allow it; the converted .lmc is unaffected. Switch the preview to 'File bytes' if this guess is wrong.",
};

@Component({
  selector: 'app-converter-page',
  imports: [FileDropComponent, OptionsFormComponent, PaletteGridComponent, OutputPreviewComponent],
  template: `
    <app-file-drop (fileSelected)="onFile($event)" />

    @if (parseError()) {
      <p class="error">{{ parseError() }}</p>
    }

    @for (notice of notices(); track notice) {
      <p class="notice">{{ noticeText(notice) }}</p>
    }

    <!-- paletteData() !== null is the page's only init-state fact. Errors
         and notices above stay outside this gate so a failed parse and the
         init screen render together instead of competing. Behind this gate,
         app-options-form and app-output-preview only ever receive
         loaded-file state: lmcText() is a string whenever palette() is
         non-null. Returning to the init branch destroys and recreates
         app-options-form, resetting its headerDirty/userComment bookkeeping;
         a subsequent file load re-seeds the header regardless. Behind this
         gate, app-palette-grid's own @if (palette()) guard and
         app-output-preview's disabled-while-null download button can never
         fire; they are defense in depth, not load-bearing. -->
    @if (paletteData() !== null) {
      <app-palette-grid
        [palette]="gridPalette()"
        [system]="options().system ?? 'nes'"
        [mode]="effectiveMode()"
        [availableModes]="availableModes()"
        [clipped]="gridClipped()"
        [hdrColors]="gridHdrColors()"
        [device]="gridDevice()"
        (modeChange)="previewMode.set($event)"
        (hdrRenderFailed)="onHdrRenderFailed()"
      />

      <app-options-form
        [options]="options()"
        [selectableSystems]="selectableSystems()"
        (optionsChange)="options.set($event)"
      />

      <app-output-preview
        [lmcText]="lmcText()"
        [filename]="options().paletteName"
        (download)="onDownload()"
      />
    } @else {
      <!-- The only copy of the drop-a-file message and supported-system
           list in the app; OptionsFormComponent has no equivalent hint, so
           there is no second copy to keep in sync. Styling matches the
           established hint convention (--mat-sys-on-surface-variant,
           body-small) used elsewhere in this component. -->
      <p class="init-hint">Drop a palette file on the top selector to start. Supported systems:</p>
      <ul class="init-hint init-systems">
        <li>NES &mdash; 192-byte .pal (1536-byte emphasis files accepted; base palette only)</li>
        <li>Commodore 64 / VIC-20 &mdash; VICE .vpl</li>
        <li>Atari 7800 / 2600 &mdash; 768-byte .pal</li>
      </ul>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .error {
        color: var(--mat-sys-error);
        margin: 0;
      }
      .notice {
        color: var(--mat-sys-on-surface-variant);
        background: var(--mat-sys-surface-container);
        border-radius: 8px;
        padding: 0.75rem;
        margin: 0;
      }
      .init-hint {
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
        margin: 0;
      }
      .init-systems {
        padding-left: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
    `,
  ],
})
// Every template read here is a signal, a computed, or a child
// component's output, so the default change-detection strategy never
// goes stale.
export class ConverterPageComponent {
  private readonly conversionService = inject(ConversionService);
  private readonly hdrDisplayService = inject(HdrDisplayService);

  protected readonly palette = signal<Rgb[] | null>(null);
  // Signal<LmcOptions> requires a concrete value at construction, so
  // DEFAULT_OPTIONS seeds this signal; the init gate ensures this seed
  // never renders before a file loads.
  protected readonly options = signal<LmcOptions>(DEFAULT_OPTIONS);
  protected readonly parseError = signal<string | null>(null);
  protected readonly notices = signal<ParserNotice[]>([]);
  protected readonly selectableSystems = signal<SystemId[]>(['nes']);
  protected readonly nesHdr = signal<NesHdrDetection | null>(null);
  // null means auto; an explicit choice survives a monitor change but
  // resets to auto on a new file load (mirrors the userComment/
  // headerDirty reset precedent, converter plan DL-001).
  protected readonly previewMode = signal<PreviewMode | null>(null);

  // Doubles as the template gate's init-state signal: null before the first
  // successful parse and after any failed parse, since onFile resets
  // `palette` to null on failure -- the gate is therefore also the
  // return-to-init mechanism.
  protected readonly paletteData = computed(() => this.palette());

  protected readonly lmcText = computed(() => {
    const p = this.palette();
    return p ? this.conversionService.convert(p, this.options()) : null;
  });

  // Mode matrix (HDR plan DL-003): no detection -> [] (the grid renders raw with
  // no toggle); detection + GPUDevice + HDR display -> all three modes;
  // detection otherwise -> the two platform-safe modes.
  protected readonly availableModes = computed<PreviewMode[]>(() => {
    if (!this.nesHdr()) return [];
    const gpu = this.hdrDisplayService.gpu();
    const hasDevice = gpu !== 'unprobed' && gpu !== 'probing' && gpu !== 'unavailable';
    if (hasDevice && this.hdrDisplayService.displayIsHdr()) {
      return ['hdr', 'sdr-normalized', 'raw'];
    }
    return ['sdr-normalized', 'raw'];
  });

  // An explicit previewMode wins only while it remains among
  // availableModes -- a monitor change can shrink availableModes out
  // from under a stale explicit 'hdr' choice, degrading automatically.
  protected readonly effectiveMode = computed<PreviewMode>(() => {
    const modes = this.availableModes();
    const explicit = this.previewMode();
    if (explicit && modes.includes(explicit)) return explicit;
    return modes[0] ?? 'raw';
  });

  private readonly normalizedSdrResult = computed<{ entries: Rgb[]; clipped: boolean[] } | null>(
    () => {
      const p = this.palette();
      const hdr = this.nesHdr();
      if (!p || !hdr || this.effectiveMode() !== 'sdr-normalized') return null;
      return this.conversionService.normalizedSdr(p, hdr.whiteLevel);
    },
  );

  protected readonly gridPalette = computed<Rgb[] | null>(
    () => this.normalizedSdrResult()?.entries ?? this.palette(),
  );

  protected readonly gridClipped = computed<boolean[] | null>(
    () => this.normalizedSdrResult()?.clipped ?? null,
  );

  protected readonly gridHdrColors = computed<Rgb[] | null>(() => {
    const p = this.palette();
    const hdr = this.nesHdr();
    if (!p || !hdr || this.effectiveMode() !== 'hdr') return null;
    return this.conversionService.hdrPreviewColors(p, hdr.whiteLevel);
  });

  protected readonly gridDevice = computed<GPUDevice | null>(() => {
    const gpu = this.hdrDisplayService.gpu();
    return gpu !== 'unprobed' && gpu !== 'probing' && gpu !== 'unavailable' ? gpu : null;
  });

  // Re-seeds the options signal's header (sampleRate/decimation) from
  // SYSTEMS for the detected system/pal default whenever a new file loads
  // -- OptionsFormComponent's own dirty-flag rule then protects this seed
  // from being clobbered by an in-progress hand edit on the next
  // system/norm switch.
  async onFile(file: File): Promise<void> {
    this.parseError.set(null);
    // A new file is a new judgment context (HDR plan DL-003): any explicit preview
    // choice from a prior file never survives a load.
    this.previewMode.set(null);

    const result = await this.conversionService.readPaletteFile(file);

    if (result.ok) {
      this.palette.set(result.entries);
      this.notices.set(result.notices);
      this.selectableSystems.set(result.selectableSystems);
      this.nesHdr.set(result.nesHdr ?? null);
      if (result.nesHdr) {
        // Idempotent and lazy (DL-006): only a headroom-palette load ever
        // pays the adapter/device probe cost.
        this.hdrDisplayService.probe();
      }
      const header = defaultOptionsFor(result.system, 'pal');
      this.options.update((current) => ({
        ...current,
        system: result.system,
        tvNorm: 'pal',
        sampleRate: header.sampleRate,
        decimation: header.decimation,
        paletteName: result.paletteName ?? stripExtension(file.name),
        sourceFileName: file.name,
        // Every loaded file starts with the auto-generated S3.3 comment
        // block, regardless of a comment typed for a previously loaded
        // file (options-form.component.ts resets its own private copy).
        // (ref: DL-001)
        comment: undefined,
      }));
    } else {
      this.palette.set(null);
      this.notices.set([]);
      this.nesHdr.set(null);
      this.parseError.set(`"${file.name}": ${result.message}`);
    }
  }

  onDownload(): void {
    const text = this.lmcText();
    if (text !== null) {
      this.conversionService.download(text, this.options().paletteName);
    }
  }

  // Pins the current file to sdr-normalized on a WebGPU render failure;
  // the next file load resets to auto via onFile's previewMode.set(null).
  onHdrRenderFailed(): void {
    this.previewMode.set('sdr-normalized');
  }

  protected noticeText(notice: ParserNotice): string {
    return NOTICE_TEXT[notice];
  }
}
