import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { LmcOptions } from '../../core/palette/models';
import { headerFor, SystemId, SYSTEMS, TvNorm } from '../../core/palette/system';

function integerValidator(control: AbstractControl): ValidationErrors | null {
  return Number.isInteger(control.value) ? null : { notInteger: true };
}

function rangeValidator(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return typeof value === 'number' && value >= min && value <= max
      ? null
      : { outOfRange: { min, max } };
  };
}

function positiveValidator(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'number' && control.value > 0 ? null : { notPositive: true };
}

const RECOMMENDED_DECIMATION_MIN = 1;
const RECOMMENDED_DECIMATION_MAX = 8;

function isWithinRecommendedDecimationRange(value: number): boolean {
  return value >= RECOMMENDED_DECIMATION_MIN && value <= RECOMMENDED_DECIMATION_MAX;
}

const COMMODORE_SYSTEMS: SystemId[] = ['c64', 'vic20'];

@Component({
  selector: 'app-options-form',
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
  ],
  template: `
    <form [formGroup]="form">
      <mat-form-field>
        <mat-label>Palette name</mat-label>
        <input matInput type="text" formControlName="paletteName" />
      </mat-form-field>

      <fieldset>
        <legend>System</legend>
        <!-- The radio group has no init-state guard of its own:
             ConverterPageComponent's init gate constructs this form only
             after a file has loaded, so selectableSystems() is non-empty
             whenever this fieldset renders. -->
        <mat-radio-group formControlName="system">
          @for (s of selectableSystems(); track s) {
            <mat-radio-button [value]="s">{{ systemDisplayName(s) }}</mat-radio-button>
          }
        </mat-radio-group>
      </fieldset>

      @if (showNormToggle()) {
        <fieldset>
          <legend>TV norm</legend>
          <mat-radio-group formControlName="tvNorm">
            <mat-radio-button value="pal">PAL</mat-radio-button>
            <mat-radio-button value="ntsc">NTSC</mat-radio-button>
          </mat-radio-group>
        </fieldset>
      }

      @if (currentSystem() === 'nes') {
        <fieldset>
          <legend>Color $0D ("blacker than black")</legend>
          <p class="color0d-hint">
            On real hardware $0D dips below black level; some games draw cursors, outlines, or whole
            backgrounds with it. Lumacode can't go below black, so choose how to map it.
          </p>
          <mat-radio-group formControlName="color0d">
            <mat-radio-button value="visible">
              Visible — remap to 303030, matching the official presets, so $0D artwork stays
              distinguishable from black
            </mat-radio-button>
            <mat-radio-button value="strict">
              Strict — keep the .pal file's value (usually 000000, same as regular black)
            </mat-radio-button>
          </mat-radio-group>
        </fieldset>
      }

      <mat-form-field>
        <mat-label>Comment block</mat-label>
        <textarea matInput rows="3" formControlName="comment"></textarea>
      </mat-form-field>

      <mat-expansion-panel class="advanced-panel">
        <mat-expansion-panel-header>
          <mat-panel-title>Advanced: RT4K sampling</mat-panel-title>
        </mat-expansion-panel-header>
        <p class="sampling-hint">{{ samplingHint() }}</p>
        <mat-form-field>
          <mat-label>Sample rate</mat-label>
          <input matInput type="number" step="1" formControlName="sampleRate" />
          <mat-error>Sample rate must be a whole number between 1 and 4095.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Decimation</mat-label>
          <input matInput type="number" step="1" formControlName="decimation" />
          @if (decimationOutOfRecommendedRange()) {
            <mat-hint>Recommended decimation is 1-8; this value will still be used.</mat-hint>
          }
          <mat-error>Decimation must be a positive whole number.</mat-error>
        </mat-form-field>
      </mat-expansion-panel>
    </form>
  `,
  styles: [
    `
      form {
        display: flex;
        flex-direction: column;
        margin-top: 1rem;
      }
      mat-form-field {
        width: 100%;
      }
      fieldset {
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 8px;
        margin: 0 0 1.25rem;
      }
      legend {
        font: var(--mat-sys-label-large);
        padding: 0 0.5rem;
      }
      .color0d-hint,
      .sampling-hint {
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
        margin: 0 0.5rem 0.5rem;
      }
      .advanced-panel {
        margin-bottom: 1.25rem;
      }
      .advanced-panel .sampling-hint {
        margin: 0 0 1rem;
      }
      mat-radio-group {
        display: flex;
        flex-direction: column;
      }
    `,
  ],
})
// Reactive-forms directives manage their DOM independently of change
// detection; every other template read (currentSystem, selectableSystems,
// showNormToggle, samplingHint, decimationOutOfRecommendedRange) is a
// signal, an input signal, or a computed/signal bridged from form values
// via effect(), so the default change-detection strategy cannot go
// stale here.
export class OptionsFormComponent {
  readonly options = input.required<LmcOptions>();
  readonly selectableSystems = input<SystemId[]>(['nes']);
  readonly optionsChange = output<LmcOptions>();

  protected readonly decimationOutOfRecommendedRange = signal(false);
  protected readonly currentSystem = signal<SystemId>('nes');
  protected readonly showNormToggle = computed(() =>
    COMMODORE_SYSTEMS.includes(this.currentSystem()),
  );
  protected readonly samplingHint = computed(() => SYSTEMS[this.currentSystem()].samplingHint);

  private userComment: string | undefined = undefined;
  // Mirrors the userComment precedent: a private dirty flag, set only by
  // the header controls' own valueChanges, so a system/norm switch never
  // overwrites a value the user is mid-edit on.
  private headerDirty = false;
  private lastSourceFileName: string | undefined;
  private previousSystem: SystemId = 'nes';
  private previousTvNorm: TvNorm = 'pal';

  protected readonly form = new FormGroup({
    paletteName: new FormControl('', { nonNullable: true }),
    system: new FormControl<SystemId>('nes', { nonNullable: true }),
    tvNorm: new FormControl<TvNorm>('pal', { nonNullable: true }),
    sampleRate: new FormControl(4092, {
      nonNullable: true,
      validators: [integerValidator, rangeValidator(1, 4095)],
    }),
    decimation: new FormControl(4, {
      nonNullable: true,
      validators: [integerValidator, positiveValidator],
    }),
    color0d: new FormControl<'strict' | 'visible'>('visible', { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    // Coordinates three concerns that all touch sampleRate/decimation
    // (mirrors the userComment dirty-flag precedent):
    // 1. Loading a new file resets headerDirty so the container's fresh
    //    per-system defaults (input effect below) take effect.
    // 2. The header controls' own valueChanges set headerDirty, marking
    //    an in-progress hand edit.
    // 3. A system/tvNorm transition re-seeds sampleRate/decimation from
    //    SYSTEMS (form.valueChanges below) only while headerDirty is
    //    false, so switching systems never silently discards an edit.
    effect(() => {
      const opts = this.options();
      if (opts.sourceFileName !== this.lastSourceFileName) {
        // A new file was loaded: drop any pending header edit so the
        // fresh per-system defaults the container just seeded take effect.
        // Also drop the private comment copy -- emitChange re-emits
        // userComment on every change, so a stale copy would otherwise
        // survive the container's comment: undefined seed.
        // (ref: DL-001)
        this.headerDirty = false;
        this.userComment = undefined;
        this.lastSourceFileName = opts.sourceFileName;
      }
      const system = opts.system ?? 'nes';
      const tvNorm = opts.tvNorm ?? 'pal';
      this.previousSystem = system;
      this.previousTvNorm = tvNorm;
      this.currentSystem.set(system);
      this.form.patchValue(
        {
          paletteName: opts.paletteName,
          system,
          tvNorm,
          sampleRate: opts.sampleRate,
          decimation: opts.decimation,
          color0d: opts.color0d,
          comment: opts.comment ?? '',
        },
        { emitEvent: false },
      );
      this.decimationOutOfRecommendedRange.set(
        !isWithinRecommendedDecimationRange(opts.decimation),
      );
    });

    effect(() => {
      if (this.selectableSystems().length <= 1) {
        this.form.controls.system.disable({ emitEvent: false });
      } else {
        this.form.controls.system.enable({ emitEvent: false });
      }
    });

    this.form.controls.comment.valueChanges.subscribe((value) => {
      this.userComment = value;
    });

    this.form.controls.sampleRate.valueChanges.subscribe(() => {
      this.headerDirty = true;
    });

    this.form.controls.decimation.valueChanges.subscribe((value) => {
      this.headerDirty = true;
      this.decimationOutOfRecommendedRange.set(!isWithinRecommendedDecimationRange(value));
    });

    this.form.valueChanges.subscribe(() => {
      const system = this.form.controls.system.value;
      const tvNorm = this.form.controls.tvNorm.value;
      // Re-seed sampleRate/decimation from SYSTEMS on a genuine system/norm
      // transition, but only while the user hasn't hand-edited them --
      // otherwise a switch would silently discard an in-progress edit the
      // same way overwriting userComment would.
      if ((system !== this.previousSystem || tvNorm !== this.previousTvNorm) && !this.headerDirty) {
        const header = headerFor(system, tvNorm);
        this.form.patchValue(
          { sampleRate: header.rate, decimation: header.dec },
          { emitEvent: false },
        );
      }
      this.previousSystem = system;
      this.previousTvNorm = tvNorm;
      this.currentSystem.set(system);

      if (this.form.valid) {
        this.emitChange();
      }
    });
  }

  protected systemDisplayName(system: SystemId): string {
    return SYSTEMS[system].displayName;
  }

  private emitChange(): void {
    const value = this.form.getRawValue();
    this.optionsChange.emit({
      paletteName: value.paletteName,
      sampleRate: value.sampleRate,
      decimation: value.decimation,
      color0d: value.color0d,
      system: value.system,
      tvNorm: value.tvNorm,
      sourceFileName: this.options().sourceFileName,
      comment: this.userComment,
    });
  }
}
