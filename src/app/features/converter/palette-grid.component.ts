import { Component, computed, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { Rgb } from '../../core/palette/models';
import { SystemId } from '../../core/palette/system';
import { HdrGridRenderer } from './hdr-grid-renderer';

export type PreviewMode = 'hdr' | 'sdr-normalized' | 'raw';

const MODE_LABELS: Record<PreviewMode, string> = {
  hdr: 'HDR',
  'sdr-normalized': 'SDR normalized',
  raw: 'File bytes',
};

const COMMODORE_COLOR_NAMES = [
  'Black',
  'White',
  'Red',
  'Cyan',
  'Purple',
  'Green',
  'Blue',
  'Yellow',
  'Orange',
  'Brown',
  'Light Red',
  'Dark Grey',
  'Medium Grey',
  'Light Green',
  'Light Blue',
  'Light Grey',
];

function hexLabel(index: number): string {
  return `$${index.toString(16).padStart(2, '0')}`;
}

function commodoreLabel(index: number): string {
  return `${index} ${COMMODORE_COLOR_NAMES[index]}`;
}

// Always source order, never LumaCode order (the grid is the human sanity
// check against the source file or emulator palette viewer): nes keeps its
// existing $xx PPU-order labels; c64/vic20 show the Commodore color number
// and name in Commodore order; a7800/a2600 show $xx MARIA-byte labels, one
// hue per row of 16.
function labelFor(system: SystemId, index: number): string {
  return system === 'c64' || system === 'vic20' ? commodoreLabel(index) : hexLabel(index);
}

function toCss(rgb: Rgb): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

@Component({
  selector: 'app-palette-grid',
  template: `
    @if (availableModes().length >= 2) {
      <div class="mode-toggle" role="radiogroup" aria-label="Preview mode">
        @for (m of availableModes(); track m) {
          <button
            type="button"
            class="mode-option"
            [class.selected]="mode() === m"
            (click)="modeChange.emit(m)"
          >
            {{ modeLabel(m) }}
          </button>
        }
      </div>
    }

    @if (palette(); as p) {
      @if (availableModes().length === 0) {
        <div class="grid">
          @for (i of indices(); track i) {
            <div class="swatch" [style.background-color]="toCss(p[i])" [title]="label(i)">
              <span class="label">{{ label(i) }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="grid-wrap">
          @if (mode() === 'hdr') {
            <canvas #hdrCanvas class="hdr-canvas"></canvas>
          }
          <div class="grid" [class.hdr-mode]="mode() === 'hdr'">
            @for (i of indices(); track i) {
              <div
                class="swatch"
                [style.background-color]="mode() === 'hdr' ? 'transparent' : toCss(p[i])"
                [title]="swatchTitle(i)"
              >
                @if (isClipped(i)) {
                  <span class="clip-marker"></span>
                }
                <span class="label">{{ label(i) }}</span>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .mode-toggle {
        display: flex;
        gap: 0.5rem;
      }
      .mode-option {
        font: var(--mat-sys-label-small);
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        border: 1px solid var(--mat-sys-outline-variant);
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
        cursor: pointer;
      }
      .mode-option.selected {
        background: var(--mat-sys-secondary-container);
        border-color: var(--mat-sys-secondary);
      }
      .grid-wrap {
        position: relative;
      }
      .hdr-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(16, 1fr);
        gap: 2px;
      }
      .grid.hdr-mode {
        position: relative;
      }
      .swatch {
        position: relative;
        aspect-ratio: 1;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .clip-marker {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.85);
      }
      .label {
        font-size: 0.5rem;
        color: rgba(255, 255, 255, 0.7);
        mix-blend-mode: difference;
      }
    `,
  ],
})
// The grid renders from computed()s derived from its inputs, so the
// default change-detection strategy never goes stale.
export class PaletteGridComponent {
  readonly palette = input<Rgb[] | null>(null);
  readonly system = input<SystemId>('nes');
  readonly mode = input<PreviewMode>('raw');
  readonly availableModes = input<PreviewMode[]>([]);
  readonly clipped = input<boolean[] | null>(null);
  readonly hdrColors = input<Rgb[] | null>(null);
  readonly device = input<GPUDevice | null>(null);

  readonly modeChange = output<PreviewMode>();
  readonly hdrRenderFailed = output<void>();

  private readonly hdrCanvas = viewChild<ElementRef<HTMLCanvasElement>>('hdrCanvas');

  protected readonly indices = computed(() =>
    Array.from({ length: this.palette()?.length ?? 0 }, (_, i) => i),
  );

  constructor() {
    // Owns the renderer's full lifecycle (DL-004/DL-005): reruns on any
    // mode/device/color change, tearing down the previous renderer via
    // onCleanup before constructing a new one, so a stale renderer never
    // draws over a new file's colors.
    effect((onCleanup) => {
      const canvasRef = this.hdrCanvas();
      const device = this.device();
      const colors = this.hdrColors();

      if (this.mode() !== 'hdr' || !canvasRef || !device) return;

      const renderer = new HdrGridRenderer({
        canvas: canvasRef.nativeElement,
        device,
        onFailure: () => this.hdrRenderFailed.emit(),
      });
      renderer.configure();
      if (colors) renderer.render(colors);

      onCleanup(() => renderer.destroy());
    });
  }

  protected modeLabel(m: PreviewMode): string {
    return MODE_LABELS[m];
  }

  protected isClipped(index: number): boolean {
    return this.clipped()?.[index] ?? false;
  }

  protected swatchTitle(index: number): string {
    const base = this.label(index);
    return this.isClipped(index) ? `${base} (clips: exceeds SDR white)` : base;
  }

  protected label(index: number): string {
    return labelFor(this.system(), index);
  }

  protected toCss = toCss;
}
