// Unit tests for parseVpl: TYPE exact-token discrimination
// (VICII vs the VIC prefix), tagless-file fallback, single-digit and
// uppercase hex, legacy dither-column tolerance, and strict entry-count /
// line-shape rejection.

import { describe, expect, it } from 'vitest';
import { parseVpl } from './vpl-parser';
import { CJAM_VPL, LEGACY_DITHER_VPL, PEPTO_NTSC_VPL, VICE_VPL } from './fixtures/vpl-fixtures';

describe('parseVpl', () => {
  it('captures TYPE:VICII as c64 and the NAME tag from cjam.vpl', () => {
    const result = parseVpl(CJAM_VPL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.machine).toBe('c64');
    expect(result.name).toBe('Christopher Jam');
    expect(result.entries).toHaveLength(16);
  });

  it('captures TYPE:VIC as vic20 (exact-token, not a VICII prefix match) from vice.vpl', () => {
    const result = parseVpl(VICE_VPL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.machine).toBe('vic20');
    expect(result.name).toBe('original VICE palette');
    expect(result.entries).toHaveLength(16);
  });

  it('leaves machine undefined for a tagless file', () => {
    const tagless = CJAM_VPL.replace('# TYPE:VICII\n', '').replace('# NAME:Christopher Jam\n', '');
    const result = parseVpl(tagless);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.machine).toBeUndefined();
  });

  it('parses single-digit hex (pepto-ntsc.vpl "0  0  0")', () => {
    const result = parseVpl(PEPTO_NTSC_VPL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries[0]).toEqual({ r: 0, g: 0, b: 0 });
    expect(result.entries).toHaveLength(16);
  });

  it('parses uppercase hex (cjam.vpl "FF FF FF")', () => {
    const result = parseVpl(CJAM_VPL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entries[1]).toEqual({ r: 0xff, g: 0xff, b: 0xff });
  });

  it('ignores a legacy 4th dither nibble and sets ditherIgnored', () => {
    const result = parseVpl(LEGACY_DITHER_VPL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ditherIgnored).toBe(true);
    expect(result.entries[1]).toEqual({ r: 0x11, g: 0x11, b: 0x11 });
  });

  it('does not set ditherIgnored for a file without a 4th column', () => {
    const result = parseVpl(CJAM_VPL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ditherIgnored).toBe(false);
  });

  it('rejects 15 data lines with wrong-entry-count', () => {
    const fifteenLines = CJAM_VPL.split('\n').slice(0, -3).join('\n');
    const result = parseVpl(fifteenLines);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-entry-count');
  });

  it('rejects 17 data lines with wrong-entry-count', () => {
    const seventeenLines = `${CJAM_VPL}\n11 22 33\n`;
    const result = parseVpl(seventeenLines);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('wrong-entry-count');
  });

  // message field matches ParseResult/AtariParseResult's ok:false
  // shape (DL-003).
  it('rejects a malformed token with bad-line and a human-readable message', () => {
    const malformed = CJAM_VPL.replace('00 00 00', 'not a color');
    const result = parseVpl(malformed);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('bad-line');
    expect(result.message).toContain('not a color');
  });
});
