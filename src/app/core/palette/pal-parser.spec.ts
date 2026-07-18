import { describe, expect, it } from 'vitest';
import { parsePal } from './pal-parser';
import { decodePalBase64, NES_CLASSIC_FBX_PAL_B64 } from './fixtures/pal-fixtures';

describe('parsePal', () => {
  it('parses a 192-byte .pal into 64 entries with emphasisIgnored false', () => {
    const bytes = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);

    const result = parsePal(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emphasisIgnored).toBe(false);
    expect(result.entries.length).toBe(64);

    for (const index of [0, 13, 63]) {
      const offset = index * 3;
      expect(result.entries[index]).toEqual({
        r: bytes[offset],
        g: bytes[offset + 1],
        b: bytes[offset + 2],
      });
    }
  });

  it('parses a 1536-byte .pal by reading only block 0, ignoring emphasis blocks', () => {
    const block0 = decodePalBase64(NES_CLASSIC_FBX_PAL_B64);
    const bytes = new Uint8Array(1536);
    bytes.set(block0, 0);
    bytes.fill(0xff, block0.length);

    const result = parsePal(bytes);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emphasisIgnored).toBe(true);
    expect(result.entries.length).toBe(64);

    for (const index of [0, 13, 63]) {
      const offset = index * 3;
      expect(result.entries[index]).toEqual({
        r: block0[offset],
        g: block0[offset + 1],
        b: block0[offset + 2],
      });
    }
  });

  // Asserts the full { reason; message } shape locally, matching
  // the assertions in vpl-parser.spec.ts and atari-pal-parser.spec.ts
  // (DL-008).
  it.each([0, 191, 193, 384, 1537])(
    'rejects an invalid size of %i bytes',
    (size) => {
      const bytes = new Uint8Array(size);

      const result = parsePal(bytes);

      expect(result).toEqual({
        ok: false,
        reason: 'invalid-size',
        message: `expected 192 or 1536 bytes, got ${size}`,
      });
    },
  );
});
