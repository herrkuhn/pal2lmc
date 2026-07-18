import { Component, computed, input } from '@angular/core';
import { Rgb } from '../../core/palette/models';
import { SystemId } from '../../core/palette/system';

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
    @if (palette(); as p) {
      <div class="grid">
        @for (i of indices(); track i) {
          <div class="swatch" [style.background-color]="toCss(p[i])" [title]="label(i)">
            <span class="label">{{ label(i) }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(16, 1fr);
        gap: 2px;
      }
      .swatch {
        aspect-ratio: 1;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .label {
        font-size: 0.5rem;
        color: rgba(255, 255, 255, 0.7);
        mix-blend-mode: difference;
      }
    `,
  ],
})
// The grid renders from a computed derived from the palette input, so
// the default change-detection strategy never goes stale.
export class PaletteGridComponent {
  readonly palette = input<Rgb[] | null>(null);
  readonly system = input<SystemId>('nes');

  protected readonly indices = computed(() =>
    Array.from({ length: this.palette()?.length ?? 0 }, (_, i) => i),
  );

  protected label(index: number): string {
    return labelFor(this.system(), index);
  }

  protected toCss = toCss;
}
