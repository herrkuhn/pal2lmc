import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-file-drop',
  template: `
    <div
      class="drop-zone"
      [class.drop-zone--active]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <p>Drop a .pal or .vpl file here, or click to choose one.</p>
      <input #fileInput type="file" accept=".pal,.vpl" hidden (change)="onChange($event)" />
    </div>
  `,
  styles: [
    `
      .drop-zone {
        border: 2px dashed var(--mat-sys-outline);
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        color: var(--mat-sys-on-surface-variant);
      }
      .drop-zone--active {
        border-color: var(--mat-sys-primary);
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
    `,
  ],
})
// The drag-over highlight binds a signal, and every drag/drop handler
// only ever sets that signal, so the default change-detection strategy
// never goes stale.
export class FileDropComponent {
  readonly fileSelected = output<File>();

  protected readonly isDragOver = signal(false);

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
    input.value = '';
  }
}
