// Unit tests for ConversionService: readPaletteFile's format/system
// detection across all five systems and convert's per-system dispatch.

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversionService, sanitizeFilename } from './conversion.service';
import { DEFAULT_OPTIONS } from '../../core/palette/models';
import { toLumacodeOrder } from '../../core/palette/lumacode-mapper';
import { commodoreToLumacodeOrder } from '../../core/palette/commodore-mapper';
import { atariToLumacodeOrder } from '../../core/palette/atari-mapper';
import { serializeLmc } from '../../core/palette/lmc-serializer';
import { decodePalBase64, NES_CLASSIC_FBX_PAL_B64 } from '../../core/palette/fixtures/pal-fixtures';
import { CJAM_VPL, VICE_VPL } from '../../core/palette/fixtures/vpl-fixtures';
import { defaultOptionsFor } from '../../core/palette/system';

// Fully duplicated by construction; breakOnePair flips a single byte so
// exactly one of the 128 adjacent pairs disagrees, matching the notice's
// "duplicatePairsBroken" name (a property of one pair, not the whole file).
function buildAtariBytes(breakOnePair: boolean) {
  const bytes = new Uint8Array(768);
  for (let pair = 0; pair < 128; pair++) {
    const value = pair % 256;
    for (let offset = 0; offset < 6; offset++) {
      bytes[pair * 6 + offset] = value;
    }
  }
  if (breakOnePair) {
    bytes[3] = (bytes[3] + 1) % 256; // g byte of the second entry in pair 0
  }
  return bytes;
}

describe('ConversionService', () => {
  let service: ConversionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConversionService);
  });

  describe('readPaletteFile detection', () => {
    it('detects c64 from TYPE:VICII (cjam.vpl)', async () => {
      const file = new File([CJAM_VPL], 'cjam.vpl');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.system).toBe('c64');
      expect(result.selectableSystems).toEqual(['c64', 'vic20']);
      expect(result.notices).not.toContain('tagAbsent');
    });

    it('detects vic20 from TYPE:VIC (vice.vpl)', async () => {
      const file = new File([VICE_VPL], 'vice.vpl');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.system).toBe('vic20');
    });

    it('defaults a tagless .vpl to c64 with a tagAbsent notice', async () => {
      const tagless = CJAM_VPL.replace('# TYPE:VICII\n', '');
      const file = new File([tagless], 'tagless.vpl');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.system).toBe('c64');
      expect(result.notices).toContain('tagAbsent');
    });

    it('matches the .vpl extension case-insensitively', async () => {
      const file = new File([CJAM_VPL], 'cjam.VPL');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
    });

    it('detects nes from a 192-byte file', async () => {
      const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
      const file = new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.system).toBe('nes');
      expect(result.selectableSystems).toEqual(['nes']);
      expect(result.notices).not.toContain('emphasisIgnored');
    });

    it('detects nes with emphasisIgnored from a 1536-byte file', async () => {
      const block0 = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
      const bytes = new Uint8Array(1536);
      bytes.set(block0, 0);
      const file = new File([bytes], 'emphasis.pal');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.notices).toContain('emphasisIgnored');
    });

    it('detects a2600 from a 768-byte file with all pairs duplicated', async () => {
      const bytes = buildAtariBytes(false);
      const file = new File([bytes], 'atari.pal');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.system).toBe('a2600');
      expect(result.selectableSystems).toEqual(['a7800', 'a2600']);
      expect(result.notices).not.toContain('duplicatePairsBroken');
    });

    it('detects a7800 from a 768-byte file with one broken pair, with a notice', async () => {
      const bytes = buildAtariBytes(true);
      const file = new File([bytes], 'atari.pal');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.system).toBe('a7800');
      expect(result.notices).toContain('duplicatePairsBroken');
    });

    it('rejects a 500-byte file naming every accepted input', async () => {
      const file = new File([new Uint8Array(500)], 'bad.pal');
      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.message).toContain('192');
      expect(result.message).toContain('768');
      expect(result.message).toContain('1536');
      expect(result.message).toContain('.vpl');
      expect(result.message).toContain('500');
    });
  });

  // Pins DL-002: file.text()/file.arrayBuffer() rejections surface
  // as ok:false with a non-empty message.
  describe('read failures', () => {
    it('routes a text() rejection into ok:false with a non-empty message', async () => {
      const file = new File([CJAM_VPL], 'rejects.vpl');
      vi.spyOn(file, 'text').mockRejectedValue(new Error('disk read error'));

      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('routes an arrayBuffer() rejection into ok:false with a non-empty message', async () => {
      const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
      const file = new File([new Uint8Array(bytes)], 'rejects.pal');
      vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('disk read error'));

      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('still yields a usable string message when the rejection is not an Error', async () => {
      const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
      const file = new File([new Uint8Array(bytes)], 'rejects.pal');
      vi.spyOn(file, 'arrayBuffer').mockRejectedValue('plain string rejection');

      const result = await service.readPaletteFile(file);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.message).toContain('plain string rejection');
    });
  });

  describe('convert dispatch', () => {
    it('dispatches nes to toLumacodeOrder', async () => {
      const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
      const parsed = await service.readPaletteFile(
        new File([new Uint8Array(bytes)], 'NES Classic (FBX).pal'),
      );
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const options = { ...DEFAULT_OPTIONS, paletteName: 'NES Classic (FBX)' };
      const expected = serializeLmc(toLumacodeOrder(parsed.entries, options.color0d), options);
      expect(service.convert(parsed.entries, options)).toBe(expected);
    });

    it.each(['c64', 'vic20'] as const)('dispatches %s to commodoreToLumacodeOrder', (system) => {
      const entries = Array.from({ length: 16 }, (_, i) => ({ r: i, g: i, b: i }));
      const options = { ...defaultOptionsFor(system, 'pal'), paletteName: 'x' };
      const expected = serializeLmc(commodoreToLumacodeOrder(entries), options);
      expect(service.convert(entries, options)).toBe(expected);
    });

    it.each(['a7800', 'a2600'] as const)('dispatches %s to atariToLumacodeOrder', (system) => {
      const entries = Array.from({ length: 256 }, (_, i) => ({ r: i % 256, g: i % 256, b: i % 256 }));
      const options = { ...defaultOptionsFor(system, 'pal'), paletteName: 'x' };
      const expected = serializeLmc(atariToLumacodeOrder(entries), options);
      expect(service.convert(entries, options)).toBe(expected);
    });
  });

  describe('download', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates an object URL, clicks an anchor with the sanitized filename, and revokes the URL', () => {
      vi.useFakeTimers();

      // Spy on the existing statics instead of replacing the global: a
      // stubbed-in plain object is not constructible, and it leaks past
      // this file to break `new URL(...)` for every later spec file that
      // runs in the same vitest worker.
      const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const anchor = document.createElement('a');
      const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue(anchor);

      service.download('some text', 'a/b:c*d');

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(anchor.download).toBe('a_b_c_d.lmc');
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();

      vi.runAllTimers();

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      vi.useRealTimers();
    });
  });

  describe('sanitizeFilename', () => {
    it('leaves an already-safe name unchanged', () => {
      expect(sanitizeFilename('NES Classic (FBX)')).toBe('NES Classic (FBX)');
    });

    it('replaces disallowed characters with underscores', () => {
      expect(sanitizeFilename('a/b:c*d')).toBe('a_b_c_d');
    });
  });
});
