import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, beforeEach } from 'vitest';
import { ConverterPageComponent } from './converter-page.component';
import { ConversionService } from './conversion.service';
import { OptionsFormComponent } from './options-form.component';
import { decodePalBase64, NES_CLASSIC_FBX_PAL_B64 } from '../../core/palette/fixtures/pal-fixtures';
import { CJAM_VPL } from '../../core/palette/fixtures/vpl-fixtures';
import { LmcOptions } from '../../core/palette/models';

function buildAtariBytes(breakOnePair: boolean): Uint8Array {
  const bytes = new Uint8Array(768);
  for (let pair = 0; pair < 128; pair++) {
    const value = pair % 256;
    for (let offset = 0; offset < 6; offset++) {
      bytes[pair * 6 + offset] = value;
    }
  }
  if (breakOnePair) {
    bytes[3] = (bytes[3] + 1) % 256;
  }
  return bytes;
}

// Cast to `any` to reach the container's protected signals directly:
// inspecting palette/options/lmcText state and driving `options` without
// going through the reactive-forms child.
describe('ConverterPageComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders 64 swatches and a preview matching ConversionService output for a 192-byte fixture', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;
    const conversionService = TestBed.inject(ConversionService);

    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    const file = new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal');

    await component.onFile(file);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const swatches = compiled.querySelectorAll('.swatch');
    expect(swatches.length).toBe(64);

    const expected = conversionService.convert(component.paletteData(), component.options());
    expect(component.lmcText()).toEqual(expected);

    const pre = compiled.querySelector('pre');
    expect(pre?.textContent).toEqual(component.lmcText());
  });

  it('shows the emphasis-ignored notice for a 1536-byte file', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const block0 = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    const bytes = new Uint8Array(1536);
    bytes.set(block0, 0);
    const file = new File([bytes], 'NES Classic (FBX)-emphasis.pal');

    await component.onFile(file);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notice')?.textContent).toContain('color-emphasis data, which is ignored');
  });

  it('shows a clear error naming every accepted input for a wrong-size file', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const file = new File([new Uint8Array(100)], 'too-small.pal');

    await component.onFile(file);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorText = compiled.querySelector('.error')?.textContent ?? '';
    expect(errorText).toContain('192');
    expect(errorText).toContain('768');
    expect(errorText).toContain('1536');
    expect(errorText).toContain('.vpl');
    expect(errorText).toContain('100');
    expect(compiled.querySelectorAll('.swatch').length).toBe(0);
    expect(compiled.querySelector('pre')?.textContent ?? '').toBe('');
  });

  it('flips index 21 between 303030 and 000000 when color0d toggles', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    const file = new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal');
    await component.onFile(file);

    component.options.update((current: LmcOptions) => ({ ...current, color0d: 'visible' }));
    fixture.detectChanges();
    const visibleEntries = component.lmcText()!.trim().split('\n\n').pop()!.split('\n');
    expect(visibleEntries.join(',').split(',')[21]).toBe('303030');

    component.options.update((current: LmcOptions) => ({ ...current, color0d: 'strict' }));
    fixture.detectChanges();
    const strictEntries = component.lmcText()!.trim().split('\n\n').pop()!.split('\n');
    expect(strictEntries.join(',').split(',')[21]).toBe('000000');
  });

  it('seeds system, selectable systems, and header defaults per loaded file kind', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const nesBytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    await component.onFile(new File([new Uint8Array(nesBytes)], 'NES Classic (FBX).pal'));
    fixture.detectChanges();
    expect(component.options().system).toBe('nes');
    expect(component.selectableSystems()).toEqual(['nes']);
    expect(component.options().sampleRate).toBe(4092);
    expect(component.options().decimation).toBe(4);

    await component.onFile(new File([CJAM_VPL], 'cjam.vpl'));
    fixture.detectChanges();
    expect(component.options().system).toBe('c64');
    expect(component.selectableSystems()).toEqual(['c64', 'vic20']);
    expect(component.options().sampleRate).toBe(4032);
    expect(component.options().decimation).toBe(4);

    await component.onFile(new File([new Uint8Array(buildAtariBytes(false))], 'atari.pal'));
    fixture.detectChanges();
    expect(component.options().system).toBe('a2600');
    expect(component.selectableSystems()).toEqual(['a7800', 'a2600']);
    expect(component.options().sampleRate).toBe(3648);
    expect(component.options().decimation).toBe(4);
  });

  it('renders notices for ditherIgnored, duplicatePairsBroken, and tagAbsent', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const tagless = CJAM_VPL.replace('# TYPE:VICII\n', '');
    await component.onFile(new File([tagless], 'tagless.vpl'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.notice')?.textContent).toContain(
      'TYPE tag',
    );

    await component.onFile(new File([new Uint8Array(buildAtariBytes(true))], 'atari.pal'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.notice')?.textContent).toContain(
      "aren't all duplicated",
    );
  });

  it("re-seeds header defaults from the options form when the user switches system without editing sampleRate/decimation, and preserves an edited value", async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    await component.onFile(new File([CJAM_VPL], 'cjam.vpl'));
    fixture.detectChanges();
    expect(component.options().sampleRate).toBe(4032);

    const optionsForm = fixture.debugElement.query(By.directive(OptionsFormComponent))
      .componentInstance as any;

    optionsForm.form.controls.tvNorm.setValue('ntsc');
    fixture.detectChanges();
    expect(component.options().sampleRate).toBe(3120);
    expect(component.options().decimation).toBe(3);

    optionsForm.form.controls.sampleRate.setValue(1111);
    optionsForm.form.controls.tvNorm.setValue('pal');
    fixture.detectChanges();
    expect(component.options().sampleRate).toBe(1111);
  });

  // Pins DL-001: the container's comment: undefined seed on file load.
  it('resets the comment to undefined when a second file loads after a comment edit', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    await component.onFile(new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal'));
    fixture.detectChanges();

    component.options.update((current: LmcOptions) => ({ ...current, comment: 'custom' }));
    fixture.detectChanges();
    expect(component.options().comment).toBe('custom');

    await component.onFile(new File([CJAM_VPL], 'cjam.vpl'));
    fixture.detectChanges();
    expect(component.options().comment).toBeUndefined();
  });

  // Pins the init gate: paletteData() === null is the page's sole init-state
  // fact, both pre-load and after a failed parse. The 'returns to the init
  // screen on a failed parse after a prior success, discarding the pending
  // header edit' spec below also covers the options-form destroy/recreate
  // lifecycle on return-to-init -- a pending header edit does not survive
  // the round trip, since a fresh file load re-seeds the header anyway.
  it('shows only the file drop and init hint before any file loads', () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.init-hint')?.textContent).toContain('Drop a palette file');
    expect(compiled.querySelectorAll('.swatch').length).toBe(0);
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('pre')).toBeNull();
  });

  it('renders the full UI and hides the init hint after a successful parse', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    await component.onFile(new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal'));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.init-hint')).toBeNull();
    expect(compiled.querySelectorAll('.swatch').length).toBe(64);
    expect(compiled.querySelector('form')).not.toBeNull();
    expect(compiled.querySelector('pre')).not.toBeNull();
  });

  it('shows the error and the init hint together on a failed first parse', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    await component.onFile(new File([new Uint8Array(100)], 'too-small.pal'));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error')?.textContent).toContain('100');
    expect(compiled.querySelector('.init-hint')?.textContent).toContain('Drop a palette file');
    expect(compiled.querySelector('form')).toBeNull();
  });

  it('returns to the init screen on a failed parse after a prior success, discarding the pending header edit', async () => {
    const fixture = TestBed.createComponent(ConverterPageComponent);
    const component = fixture.componentInstance as any;

    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    await component.onFile(new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal'));
    fixture.detectChanges();

    let optionsForm = fixture.debugElement.query(By.directive(OptionsFormComponent))
      .componentInstance as any;
    optionsForm.form.controls.sampleRate.setValue(1111);
    fixture.detectChanges();
    expect(component.options().sampleRate).toBe(1111);

    await component.onFile(new File([new Uint8Array(100)], 'too-small.pal'));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.init-hint')?.textContent).toContain('Drop a palette file');
    expect(compiled.querySelectorAll('.swatch').length).toBe(0);
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('pre')).toBeNull();
    expect(compiled.querySelector('.error')?.textContent).toContain('100');

    await component.onFile(new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal'));
    fixture.detectChanges();

    optionsForm = fixture.debugElement.query(By.directive(OptionsFormComponent))
      .componentInstance as any;
    expect(optionsForm.form.controls.sampleRate.value).toBe(4092);
    expect(component.options().sampleRate).toBe(4092);
  });
});
