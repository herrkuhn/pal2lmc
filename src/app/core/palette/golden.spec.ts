// Golden tests (spec S8): the project's correctness gate. Every golden
// .pal/.lmc pair (seven FBX-era, four NES HDR) round-trips through
// parsePal -> toLumacodeOrder -> serializeLmc to the official header and
// data lines byte-identically (comment blocks legitimately differ by
// date/attribution and are excluded). Each pair carries its canonical
// download source; see fixtures/lmc-fixtures.ts.

import { describe, expect, it } from 'vitest';
import { parsePal } from './pal-parser';
import { toLumacodeOrder } from './lumacode-mapper';
import { serializeLmc } from './lmc-serializer';
import { defaultOptionsFor } from './system';
import { decodePalBase64 } from './fixtures/pal-fixtures';
import { GOLDEN_PAIRS } from './fixtures/lmc-fixtures';
import { dataLinesOf } from './fixtures/spec-helpers';

describe('golden pairs (spec S8)', () => {
  for (const pair of GOLDEN_PAIRS) {
    describe(pair.name, () => {
      const bytes = decodePalBase64(pair.palBase64);

      it('source .pal has $0D equal to 000000', () => {
        expect([bytes[39], bytes[40], bytes[41]]).toEqual([0, 0, 0]);
      });

      // Seeds LmcOptions from defaultOptionsFor(system, tvNorm) rather than
      // a literal {rate, dec}: the header line carries the anchor and any
      // protocol tokens too, so building it from SYSTEMS pins the golden
      // suite to the SYSTEMS table itself -- a drifted rate, decimation,
      // anchor, or token fails here, not only the serializer's own table
      // test -- instead of duplicating those facts on the fixture.
      it('reproduces the official .lmc header and data lines byte-identically', () => {
        const parsed = parsePal(bytes);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const generated = serializeLmc(toLumacodeOrder(parsed.entries), {
          ...defaultOptionsFor('nes', 'pal'),
          paletteName: pair.name,
          sourceFileName: pair.palSource.pathInArchive,
        });
        expect(dataLinesOf(generated)).toEqual(dataLinesOf(pair.lmcText));
      });
    });
  }

  // The PC-10 pair is the only vendored source with a non-black $1D; every
  // other source already has $1D = 000000, so this is the one assertion
  // that would fail if toLumacodeOrder stopped forcing index 35 black.
  it("PC-10's source $1D bytes are non-zero, exercising the raw-35 fold against a real official file", () => {
    const pc10 = GOLDEN_PAIRS.find((pair) => pair.name === 'PC-10')!;
    const bytes = decodePalBase64(pc10.palBase64);
    expect([bytes[87], bytes[88], bytes[89]]).not.toEqual([0, 0, 0]);
  });
});
