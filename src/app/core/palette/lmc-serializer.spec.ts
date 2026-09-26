import { describe, expect, it } from 'vitest';
import { serializeLmc } from './lmc-serializer';
import { LmcOptions, Rgb } from './models';
import { defaultOptionsFor, headerFor, SystemId, SYSTEMS, TvNorm } from './system';

const BASE_OPTIONS: LmcOptions = {
  sampleRate: 4092,
  decimation: 4,
  paletteName: 'Test Palette',
  sourceFileName: 'test.pal',
};

describe('serializeLmc', () => {
  // The expected literal's header carries nes's anchor, protocol token,
  // syncw, and wofs: serializeLmc reads all four from SYSTEMS, never from
  // BASE_OPTIONS alone.
  it('serializes a small array with an empty comment to the exact expected literal', () => {
    const entries: Rgb[] = [
      { r: 0, g: 0, b: 0 },
      { r: 0xff, g: 0x80, b: 0x01 },
    ];

    const result = serializeLmc(entries, { ...BASE_OPTIONS, comment: '' });

    expect(result).toBe('4092 4 anchor=1 nes=1 syncw=300 wofs=10\n\n000000,ff8001\n');
  });

  it('splits a 64-entry array into exactly 4 lines of 16 comma-separated entries', () => {
    const entries: Rgb[] = Array.from({ length: 64 }, (_, i) => ({
      r: i,
      g: i,
      b: i,
    }));

    const result = serializeLmc(entries, { ...BASE_OPTIONS, comment: '' });

    const dataLines = result.trimEnd().split('\n').slice(-4);
    expect(dataLines).toHaveLength(4);
    for (const line of dataLines) {
      const parts = line.split(',');
      expect(parts).toHaveLength(16);
    }
  });

  it('normalizes a comment override with non-ASCII characters and missing # prefix', () => {
    const result = serializeLmc([], {
      ...BASE_OPTIONS,
      comment: 'café line\nno hash prefix',
    });

    expect(result).toContain('# caf line');
    expect(result).toContain('# no hash prefix');
    expect(result).not.toContain('café');
  });

  it('contains no CR characters and ends with exactly one trailing newline', () => {
    const entries: Rgb[] = [{ r: 1, g: 2, b: 3 }];
    const result = serializeLmc(entries, { ...BASE_OPTIONS, comment: '' });

    expect(result).not.toContain('\r');
    expect(result.endsWith('\n')).toBe(true);
    expect(result.endsWith('\n\n')).toBe(false);
  });
});

describe('serializeLmc multi-system generalization', () => {
  const sentinelEntries: Rgb[] = [{ r: 0xb0, g: 0xb0, b: 0xb0 }];

  it('emits uppercase hex entries for a2600 while every other system stays lowercase', () => {
    const a2600 = serializeLmc(sentinelEntries, {
      ...BASE_OPTIONS,
      comment: '',
      system: 'a2600',
      tvNorm: 'pal',
    });
    expect(a2600).toContain('B0B0B0');

    const others: SystemId[] = ['nes', 'c64', 'vic20', 'a7800'];
    for (const system of others) {
      const result = serializeLmc(sentinelEntries, {
        ...BASE_OPTIONS,
        comment: '',
        system,
        tvNorm: 'pal',
      });
      expect(result).toContain('b0b0b0');
    }
  });

  it.each([
    ['nes', 'pal', 'NES / Famicom'],
    ['c64', 'pal', 'Commodore 64 / C128 (PAL)'],
    ['c64', 'ntsc', 'Commodore 64 / C128 (NTSC)'],
    ['vic20', 'pal', 'Commodore VIC-20 (PAL)'],
    ['vic20', 'ntsc', 'Commodore VIC-20 (NTSC)'],
    ['a7800', 'pal', 'Atari 7800'],
    ['a2600', 'pal', 'Atari 2600'],
  ] as [SystemId, TvNorm, string][])(
    'comment first line names the %s/%s preset',
    (system, tvNorm, presetName) => {
      const result = serializeLmc([], { ...BASE_OPTIONS, system, tvNorm });
      expect(result.split('\n')[0]).toBe(
        `# RetroTINK LumaCode preset: ${presetName} -- ${BASE_OPTIONS.paletteName}`,
      );
    },
  );

  it('behaves exactly like nes/pal when system/tvNorm are absent', () => {
    const withDefaults = serializeLmc(sentinelEntries, { ...BASE_OPTIONS, comment: '' });
    const withExplicitNes = serializeLmc(sentinelEntries, {
      ...BASE_OPTIONS,
      comment: '',
      system: 'nes',
      tvNorm: 'pal',
    });
    expect(withDefaults).toBe(withExplicitNes);
  });

  // Each row's headerLine pairs defaultOptionsFor's rate/dec with the
  // system's anchor, protocol tokens, syncw, and wofs, so this table
  // doubles as serializeLmc's header-line coverage for every supported
  // system/norm; the ntsc rows also cover anchor=0 and the negative wofs
  // spelling. The same iteration asserts that SYSTEMS[system].samplingHint
  // names every anchor=/syncw=/wofs= token of the row's header line, so
  // the hint text agrees with SYSTEMS. Once the hand-edited-rate test below
  // confirms the same tokens survive a hand-edited sampleRate/decimation,
  // the table also proves anchor, syncw, and wofs come from SYSTEMS rather
  // than from opts.
  it.each([
    ['nes', 'pal', 4092, 4, '4092 4 anchor=1 nes=1 syncw=300 wofs=10'],
    ['c64', 'pal', 4032, 4, '4032 4 anchor=1 syncw=296 wofs=-2'],
    ['c64', 'ntsc', 3120, 3, '3120 3 anchor=1 syncw=222 wofs=-2'],
    ['vic20', 'pal', 2272, 4, '2272 4 anchor=4 syncw=128 wofs=6'],
    ['vic20', 'ntsc', 2080, 4, '2080 4 anchor=0 syncw=128 wofs=-2'],
    ['a7800', 'pal', 4086, 3, '4086 3 anchor=9 syncw=126 wofs=4'],
    ['a2600', 'pal', 3648, 4, '3648 4 anchor=7 syncw=224 wofs=-2'],
  ] as [SystemId, TvNorm, number, number, string][])(
    'defaultOptionsFor returns the verified header pair for %s/%s, and serializeLmc emits its header line and sampling hint in agreement with SYSTEMS',
    (system, tvNorm, rate, dec, headerLine) => {
      const options = defaultOptionsFor(system, tvNorm);
      expect(options.sampleRate).toBe(rate);
      expect(options.decimation).toBe(dec);
      expect(SYSTEMS[system].entryCount).toBeGreaterThan(0);

      const result = serializeLmc([], { ...options, comment: '' });
      expect(result.split('\n')[0]).toBe(headerLine);

      const { anchor, syncw, wofs } = headerFor(system, tvNorm);
      const hint = SYSTEMS[system].samplingHint;
      expect(hint).toContain(`anchor=${anchor}`);
      expect(hint).toContain(`syncw=${syncw}`);
      expect(hint).toContain(`wofs=${wofs}`);
    },
  );

  // sampleRate 1234 and decimation 2 do not appear in any SYSTEMS row, so
  // a header tail that matched them would prove the tail was read from
  // opts; matching nes/pal's tail instead proves anchor, syncw, and wofs
  // come from SYSTEMS regardless of what the caller hand-edits.
  it('keeps the system anchor, syncw, and wofs when sampleRate/decimation are hand-edited', () => {
    const result = serializeLmc([], {
      ...BASE_OPTIONS,
      comment: '',
      system: 'nes',
      tvNorm: 'pal',
      sampleRate: 1234,
      decimation: 2,
    });
    expect(result.split('\n')[0]).toBe('1234 2 anchor=1 nes=1 syncw=300 wofs=10');
  });
});
