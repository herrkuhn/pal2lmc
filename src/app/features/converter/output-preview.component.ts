import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-output-preview',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <pre class="preview">{{ lmcText() ?? '' }}</pre>
    <button matButton="filled" [disabled]="lmcText() === null" (click)="download.emit()">
      <mat-icon>download</mat-icon>
      Download {{ filename() }}.lmc
    </button>
  `,
  styles: [
    `
      .preview {
        font-family: monospace;
        white-space: pre-wrap;
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 8px;
        background: var(--mat-sys-surface-container-low);
        padding: 0.75rem;
        max-height: 20rem;
        overflow: auto;
      }
    `,
  ],
})
// The preview text binds input values only, so the default
// change-detection strategy never goes stale.
export class OutputPreviewComponent {
  readonly lmcText = input<string | null>(null);
  readonly filename = input<string>('');
  readonly download = output<void>();
}
