// Golden tests (spec S8): the project's correctness gate. Every golden
// .pal/.lmc pair (seven FBX-era, four NES HDR) must round-trip through
// parsePal -> toLumacodeOrder -> serializeLmc byte-identically on header+data
// lines (comment blocks legitimately differ by date/attribution and are
// excluded). Each pair carries its canonical download source; see
// fixtures/lmc-fixtures.ts.

import { describe, expect, it } from 'vitest';
import { parsePal } from './pal-parser';
import { toLumacodeOrder } from './lumacode-mapper';
import { serializeLmc } from './lmc-serializer';
import { decodePalBase64 } from './fixtures/pal-fixtures';
import { GOLDEN_PAIRS } from './fixtures/lmc-fixtures';
import { dataEntriesOf, dataLinesOf } from './fixtures/spec-helpers';

describe('golden pairs (spec S8)', () => {
  for (const pair of GOLDEN_PAIRS) {
    describe(pair.name, () => {
      const bytes = decodePalBase64(pair.palBase64);

      it('source .pal has $0D equal to 000000', () => {
        expect([bytes[39], bytes[40], bytes[41]]).toEqual([0, 0, 0]);
      });

      // parsed.entries (DL-004); fixture files and byte-identity
      // assertions are unaffected, preserving the correctness
      // oracle (R-002).
      it('reproduces the official .lmc header and data lines byte-identically in visible mode', () => {
        const parsed = parsePal(bytes);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const generated = serializeLmc(toLumacodeOrder(parsed.entries, 'visible'), {
          sampleRate: 4092,
          decimation: 4,
          color0d: 'visible',
          paletteName: pair.name,
          sourceFileName: pair.palSource.pathInArchive,
        });
        expect(dataLinesOf(generated)).toEqual(dataLinesOf(pair.lmcText));
      });

      it('matches the official file everywhere except index 21 in strict mode', () => {
        const parsed = parsePal(bytes);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const generated = serializeLmc(toLumacodeOrder(parsed.entries, 'strict'), {
          sampleRate: 4092,
          decimation: 4,
          color0d: 'strict',
          paletteName: pair.name,
          sourceFileName: pair.palSource.pathInArchive,
        });
        const generatedEntries = dataEntriesOf(generated);
        const officialEntries = dataEntriesOf(pair.lmcText);
        const diffIndices = generatedEntries
          .map((entry, index) => (entry === officialEntries[index] ? -1 : index))
          .filter((index) => index !== -1);
        expect(diffIndices).toEqual([21]);
        expect(generatedEntries[21]).toBe('000000');
      });
    });
  }
});
