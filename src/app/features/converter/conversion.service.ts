import { Service } from '@angular/core';
import { LmcOptions, Rgb } from '../../core/palette/models';
import { NES_EMPHASIS_FILE_SIZE, NES_SINGLE_FILE_SIZE, parsePal } from '../../core/palette/pal-parser';
import { parseVpl } from '../../core/palette/vpl-parser';
import { ATARI_FILE_SIZE, parseAtariPal } from '../../core/palette/atari-pal-parser';
import { toLumacodeOrder } from '../../core/palette/lumacode-mapper';
import { commodoreToLumacodeOrder } from '../../core/palette/commodore-mapper';
import { atariToLumacodeOrder } from '../../core/palette/atari-mapper';
import { serializeLmc } from '../../core/palette/lmc-serializer';
import { SystemId } from '../../core/palette/system';
import {
  detectNesHdrHeadroom,
  linearToSrgb,
  NesHdrDetection,
  toNormalizedSdr,
  toRelativeLinear,
} from '../../core/palette/nes-hdr';

const SANITIZE_PATTERN = /[^A-Za-z0-9 ()_-]/g;

export function sanitizeFilename(name: string): string {
  return name.replace(SANITIZE_PATTERN, '_');
}

// Used only for the no-recognized-size fall-through below: no single
// parser owns dispatch-level knowledge of every accepted size
// (192/768/1536, plus .vpl) (DL-003). NES_SINGLE_FILE_SIZE,
// NES_EMPHASIS_FILE_SIZE, and ATARI_FILE_SIZE each come from their
// owning parser, the single source of truth for that format's size
// (DL-006).
const INVALID_SIZE_MESSAGE = (actualSize: number): string =>
  `Not a valid palette file: expected 192, 768, or 1536 bytes, or a .vpl file, but got ${actualSize} bytes.`;

// Non-blocking notices (shares one mechanism with the NES emphasisIgnored
// pattern), rendered by the UI alongside emphasisIgnored.
export type ParserNotice =
  | 'emphasisIgnored'
  | 'ditherIgnored'
  | 'duplicatePairsBroken'
  | 'tagAbsent'
  | 'hdrHeadroom';

// File-detection result union spans formats and encodes UI workflow
// (pre-selection, override choices, notices) -- it lives beside
// readPaletteFile rather than in the framework-free models.ts, which stays
// per-format and stable.
export type PaletteFileResult =
  | {
      ok: true;
      entries: Rgb[];
      system: SystemId;
      selectableSystems: SystemId[];
      paletteName?: string;
      notices: ParserNotice[];
      // Set iff the NES branch's detectNesHdrHeadroom fires; the
      // 'hdrHeadroom' notice above is present iff this field is set
      // (HDR plan DL-007). Placed here, beside readPaletteFile, rather
      // than in models.ts, following the same file-detection-result-union
      // precedent as the notices field above.
      nesHdr?: NesHdrDetection;
    }
  | { ok: false; message: string };

// Root-provided singleton: exactly one instance is created and shared
// by every component that injects it.
@Service()
export class ConversionService {
  /**
   * Detects format and system from a dropped/selected file and parses it
   * into LumaCode-input-ready entries. The sole Angular-to-core crossing
   * point for parsing (core stays framework-free).
   *
   * Dispatch is by extension/size, never content sniffing beyond what a
   * parser itself needs: .vpl -> parseVpl (TYPE tag pre-selects c64/vic20,
   * tagless defaults to c64 with a tagAbsent notice); 192/1536
   * bytes -> parsePal (nes); 768 bytes -> parseAtariPal, with the
   * all-pairs-duplicate heuristic pre-selecting a2600 else a7800 and a
   * user-overridable selectableSystems, since the mapper is identity for
   * both so misdetection only changes header/case/comment. The
   * returned union (PaletteFileResult) encodes this UI workflow rather
   * than living in the framework-free models.ts.
   *
   * @param file - File chosen via drag-drop or the file picker.
   * @returns ok:true with entries, detected/selectable systems, an
   *   optional palette name, and non-blocking notices; ok:false with a
   *   human-readable message otherwise.
   */
  async readPaletteFile(file: File): Promise<PaletteFileResult> {
    try {
      return await this.readPaletteFileUnsafe(file);
    } catch (err) {
      // file.text()/file.arrayBuffer() can reject (e.g. an unreadable
      // File); routing that rejection through the same ok:false channel
      // keeps callers from needing a second, unhandled-rejection error
      // path alongside the documented discriminated union.
      // (ref: DL-002)
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Could not read file: ${message}` };
    }
  }

  private async readPaletteFileUnsafe(file: File): Promise<PaletteFileResult> {
    if (file.name.toLowerCase().endsWith('.vpl')) {
      const text = await file.text();
      const result = parseVpl(text);
      if (!result.ok) {
        return { ok: false, message: result.message };
      }
      const notices: ParserNotice[] = [];
      if (result.ditherIgnored) notices.push('ditherIgnored');
      // A tagless file defaults to c64 (the larger palette ecosystem); the
      // notice flags the guess and the system selector lets the user
      // switch, since the permutation is identical either way.
      if (!result.machine) notices.push('tagAbsent');
      return {
        ok: true,
        entries: result.entries,
        system: result.machine ?? 'c64',
        selectableSystems: ['c64', 'vic20'],
        paletteName: result.name,
        notices,
      };
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    if (buffer.length === NES_SINGLE_FILE_SIZE || buffer.length === NES_EMPHASIS_FILE_SIZE) {
      const result = parsePal(buffer);
      if (!result.ok) {
        return { ok: false, message: result.message };
      }
      // if-push style, matching the vpl branch's two-flag style above,
      // so a second NES notice flag would cost no shape change (DL-005).
      const notices: ParserNotice[] = [];
      if (result.emphasisIgnored) notices.push('emphasisIgnored');
      // Runs on the base palette (block 0) for both 192- and 1536-byte
      // inputs, matching convert()'s own block-0-only behavior; the
      // notice mirrors the nesHdr field so the two can never disagree
      // (DL-007).
      const nesHdr = detectNesHdrHeadroom(result.entries) ?? undefined;
      if (nesHdr) notices.push('hdrHeadroom');
      return {
        ok: true,
        entries: result.entries,
        system: 'nes',
        selectableSystems: ['nes'],
        notices,
        nesHdr,
      };
    }

    if (buffer.length === ATARI_FILE_SIZE) {
      const result = parseAtariPal(buffer);
      if (!result.ok) {
        return { ok: false, message: result.message };
      }
      // if-push style here too, consistent with the branch above (DL-005).
      const notices: ParserNotice[] = [];
      if (result.duplicatePairsBroken) notices.push('duplicatePairsBroken');
      // The mapper is identity either way, so misdetection only changes
      // header/case/comment and the user can flip the selector -- a
      // heuristic pre-selection beats forcing a modal choice.
      return {
        ok: true,
        entries: result.entries,
        system: result.duplicatePairsBroken ? 'a7800' : 'a2600',
        selectableSystems: ['a7800', 'a2600'],
        notices,
      };
    }

    return { ok: false, message: INVALID_SIZE_MESSAGE(buffer.length) };
  }

  /**
   * Runs the mapper for options.system (defaulting to nes) and serializes
   * the result. Plain switch, not a registry: at five systems every
   * mapper call has the identical (entries) => Rgb[] shape, so a lookup
   * table would add indirection with no behavioral variance.
   *
   * @param entries - Source-order entries from readPaletteFile.
   * @param options - Includes the effective system/tvNorm/header/comment.
   * @returns Full .lmc file text ready for download.
   */
  convert(entries: Rgb[], options: LmcOptions): string {
    switch (options.system ?? 'nes') {
      case 'nes':
        return serializeLmc(toLumacodeOrder(entries), options);
      case 'c64':
      case 'vic20':
        return serializeLmc(commodoreToLumacodeOrder(entries), options);
      case 'a7800':
      case 'a2600':
        return serializeLmc(atariToLumacodeOrder(entries), options);
    }
  }

  /**
   * SDR-normalized preview fallback: white maps to 255 and anything
   * brighter clips at 1.0 linear. A thin passthrough to core's
   * toNormalizedSdr so this service stays the sole crossing point.
   *
   * @param entries - Source-order NES entries.
   * @param whiteLevel - nesHdr.whiteLevel from readPaletteFile.
   */
  normalizedSdr(entries: Rgb[], whiteLevel: number): { entries: Rgb[]; clipped: boolean[] } {
    return toNormalizedSdr(entries, whiteLevel);
  }

  /**
   * Ready-to-upload WebGPU preview colors: composes toRelativeLinear with
   * linearToSrgb per channel, so the renderer receives extended-sRGB-
   * encoded floats (values up to about 1.56) and imports no core
   * functions itself (DL-005).
   *
   * @param entries - Source-order NES entries.
   * @param whiteLevel - nesHdr.whiteLevel from readPaletteFile.
   */
  hdrPreviewColors(entries: Rgb[], whiteLevel: number): Rgb[] {
    return toRelativeLinear(entries, whiteLevel).map((linear) => ({
      r: linearToSrgb(linear.r),
      g: linearToSrgb(linear.g),
      b: linearToSrgb(linear.b),
    }));
  }

  download(text: string, baseName: string): void {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sanitizeFilename(baseName)}.lmc`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
