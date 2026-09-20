// Golden tests (spec S8) for Commodore and Atari systems, parallel to
// golden.spec.ts (NES). Tier 1 (Commodore) golden pairs come free from
// vendored vice_vpl/ sources against the official C64/VIC20 presets. Tier 2
// (Atari) pairs share this file, guarding the serializer's uppercase hex
// path against MARIA_7800.lmc and TIA_2600.lmc.

import { describe, expect, it } from 'vitest';
import { parseVpl } from './vpl-parser';
import { commodoreToLumacodeOrder } from './commodore-mapper';
import { serializeLmc } from './lmc-serializer';
import { defaultOptionsFor } from './system';
import { dataLinesOf } from './fixtures/spec-helpers';
import { GOLDEN_PAIRS_TIER1 } from './fixtures/lmc-multisystem-fixtures';
import { parseAtariPal } from './atari-pal-parser';
import { atariToLumacodeOrder } from './atari-mapper';
import { decodePalBase64 } from './fixtures/pal-fixtures';
import { GOLDEN_PAIRS_TIER2, TREBOR_COOL_PAL_B64, TREBOR_COOL_PAL_SOURCE } from './fixtures/atari-fixtures';

describe('golden pairs Tier 1 -- Commodore (spec S8)', () => {
  for (const pair of GOLDEN_PAIRS_TIER1) {
    describe(pair.name, () => {
      // Seeds LmcOptions from defaultOptionsFor(system, tvNorm) rather than
      // the fixture's own {rate, dec}: the header line carries the anchor
      // and any protocol tokens, so building it from SYSTEMS pins the
      // golden suite to the SYSTEMS table itself instead of duplicating
      // those facts a second time on the fixture.
      it('reproduces the official .lmc header and data lines byte-identically', () => {
        const parsed = parseVpl(pair.vplText);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;

        const generated = serializeLmc(commodoreToLumacodeOrder(parsed.entries), {
          ...defaultOptionsFor(pair.system, pair.tvNorm),
          paletteName: pair.name,
          sourceFileName: pair.name,
        });

        expect(dataLinesOf(generated)).toEqual(dataLinesOf(pair.lmcText));
      });
    });
  }

  // TV norm is a header-only option (verified: NTSC/PAL official variants
  // have byte-identical data lines) -- assert the two Commodore norm pairs
  // agree on colors even though their headers differ.
  it('PAL and NTSC data lines are identical for each Commodore system (norm is header-only)', () => {
    const [c64Pal, c64Ntsc, vic20Pal, vic20Ntsc] = GOLDEN_PAIRS_TIER1;

    const c64PalData = dataLinesOf(c64Pal.lmcText).slice(1);
    const c64NtscData = dataLinesOf(c64Ntsc.lmcText).slice(1);
    expect(c64PalData).toEqual(c64NtscData);

    const vic20PalData = dataLinesOf(vic20Pal.lmcText).slice(1);
    const vic20NtscData = dataLinesOf(vic20Ntsc.lmcText).slice(1);
    expect(vic20PalData).toEqual(vic20NtscData);
  });
});

// Tier 2 (Atari) golden pairs. The mapper is identity for both systems, so
// each pair chiefly guards the serializer (hex case, header, layout) rather
// than a nontrivial reordering -- recorded here rather than hidden, per the
// near-circularity caveat in the fixture provenance. The a7800 fixture is
// scripted from MAME, never hand-typed.
describe('golden pairs Tier 2 -- Atari (spec S8)', () => {
  for (const pair of GOLDEN_PAIRS_TIER2) {
    describe(pair.name, () => {
      const bytes = decodePalBase64(pair.palBase64);

      // Seeds LmcOptions from defaultOptionsFor(system, tvNorm) for the same
      // reason as the Commodore block above: pinning the header to SYSTEMS
      // keeps the golden suite testing the single source of header facts
      // rather than a value duplicated on the fixture.
      it('reproduces the official .lmc header and data lines byte-identically', () => {
        const parsed = parseAtariPal(bytes);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;

        const generated = serializeLmc(atariToLumacodeOrder(parsed.entries), {
          ...defaultOptionsFor(pair.system, 'pal'),
          paletteName: pair.name,
          sourceFileName: pair.name,
        });

        expect(dataLinesOf(generated)).toEqual(dataLinesOf(pair.lmcText));
      });
    });
  }

  // Transcription-risk mitigations for the scripted MAME extraction: both
  // properties are true of the official MARIA_7800.lmc and would almost
  // certainly break under a mis-transcribed fixture.
  it('7800 fixture hue-0 greys step by exactly 0x11 and hue-15 repeats hue-1', () => {
    const maria = GOLDEN_PAIRS_TIER2.find((p) => p.system === 'a7800')!;
    const lines = dataLinesOf(maria.lmcText).slice(1);

    const greys = lines[0].split(',');
    for (let i = 1; i < greys.length; i++) {
      expect(parseInt(greys[i], 16) - parseInt(greys[i - 1], 16)).toBe(0x111111);
    }
    expect(lines[15]).toBe(lines[1]);
  });

  // Real-world breadth fixture, no oracle claim: only parse and convert
  // must succeed. Seeding the header from defaultOptionsFor rather than a
  // literal rate/decimation keeps this test following whatever 7800
  // header the SYSTEMS table defines.
  it('a real Trebor 768-byte file parses to 256 entries and converts without error', () => {
    const bytes = decodePalBase64(TREBOR_COOL_PAL_B64);
    expect(TREBOR_COOL_PAL_SOURCE.pathInArchive).toContain('COOL.pal');

    const parsed = parseAtariPal(bytes);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.entries).toHaveLength(256);

    const generated = serializeLmc(atariToLumacodeOrder(parsed.entries), {
      ...defaultOptionsFor('a7800', 'pal'),
      paletteName: 'Trebors NTSC CALIBRATED COOL',
      sourceFileName: 'NTSC_CALIBRATED_COOL.pal',
    });
    expect(dataLinesOf(generated).length).toBeGreaterThan(0);
  });
});
