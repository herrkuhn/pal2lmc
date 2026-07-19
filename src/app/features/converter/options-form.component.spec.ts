// Unit tests for OptionsFormComponent, including the header dirty-flag
// re-seed rule: a system/norm switch updates sampleRate and decimation
// only while the user has not hand-edited them.
// Init-gate coverage (drop-a-file screen before the first load, System
// fieldset always rendering behind the page gate) lives in
// converter-page.component.spec.ts, not here.

import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { OptionsFormComponent } from './options-form.component';
import { defaultOptionsFor } from '../../core/palette/system';

// Cast to `any` to reach the component's protected form/signals directly:
// driving header controls without going through Material's DOM and
// inspecting the private dirty flag.
describe('OptionsFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows the TV norm toggle only for c64/vic20', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('nes', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.showNormToggle()).toBe(false);

    fixture.componentRef.setInput('options', { ...defaultOptionsFor('c64', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.showNormToggle()).toBe(true);

    fixture.componentRef.setInput('options', { ...defaultOptionsFor('vic20', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.showNormToggle()).toBe(true);
  });

  it('updates both sampleRate and decimation together when toggling norm on c64', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('selectableSystems', ['c64', 'vic20']);
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('c64', 'pal'), paletteName: 'x' });
    fixture.detectChanges();

    component.form.controls.tvNorm.setValue('ntsc');

    expect(component.form.controls.sampleRate.value).toBe(3120);
    expect(component.form.controls.decimation.value).toBe(3);
  });

  it('tracks currentSystem to the loaded options', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('nes', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.currentSystem()).toBe('nes');

    fixture.componentRef.setInput('options', { ...defaultOptionsFor('a7800', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.currentSystem()).toBe('a7800');
  });

  it('tracks the sampling hint text to the current system', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;

    fixture.componentRef.setInput('options', { ...defaultOptionsFor('nes', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.samplingHint()).toContain('NES');

    fixture.componentRef.setInput('options', { ...defaultOptionsFor('a2600', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.samplingHint()).toContain('2600');
  });

  it('offers exactly the selectable systems input and disables the selector for a single (nes) option', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;

    fixture.componentRef.setInput('selectableSystems', ['nes']);
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('nes', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.form.controls.system.disabled).toBe(true);

    fixture.componentRef.setInput('selectableSystems', ['c64', 'vic20']);
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('c64', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.form.controls.system.disabled).toBe(false);
    expect(component.selectableSystems()).toEqual(['c64', 'vic20']);
  });

  it('sets the header dirty flag on a manual rate/decimation edit but not on a programmatic patch', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('nes', 'pal'), paletteName: 'x' });
    fixture.detectChanges();
    expect(component.headerDirty).toBe(false);

    fixture.componentRef.setInput('options', {
      ...defaultOptionsFor('nes', 'pal'),
      paletteName: 'x',
      sampleRate: 4092,
    });
    fixture.detectChanges();
    expect(component.headerDirty).toBe(false);

    component.form.controls.sampleRate.setValue(1234);
    expect(component.headerDirty).toBe(true);
  });

  // Pins the other half of DL-001: emitChange must not resurrect a
  // pre-reset userComment on the next unrelated form change.
  it('does not re-emit a prior file\'s comment after a new-file options input arrives with comment: undefined', () => {
    const fixture = TestBed.createComponent(OptionsFormComponent);
    const component = fixture.componentInstance as any;
    fixture.componentRef.setInput('options', { ...defaultOptionsFor('nes', 'pal'), paletteName: 'x' });
    fixture.detectChanges();

    component.form.controls.comment.setValue('custom comment');

    fixture.componentRef.setInput('options', {
      ...defaultOptionsFor('nes', 'pal'),
      paletteName: 'y',
      sourceFileName: 'second.pal',
      comment: undefined,
    });
    fixture.detectChanges();

    let emitted: { comment?: string } | undefined;
    component.optionsChange.subscribe((value: { comment?: string }) => (emitted = value));
    component.form.controls.sampleRate.setValue(1234);

    expect(emitted?.comment).toBeUndefined();
  });
});
