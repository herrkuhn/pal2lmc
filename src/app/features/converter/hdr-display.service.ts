import { Service, signal } from '@angular/core';

// Root-provided singleton (mirrors ConversionService): the converter
// page container is the only injector, so probe() below runs at most
// once regardless of how many headroom palettes load in a session.
/**
 * Capability signals the converter page reads to pick a default preview
 * mode: displayIsHdr reflects the dynamic-range media query, gpu reflects
 * the outcome of the lazy WebGPU probe. Every accessor guards for a
 * missing browser API and defaults to SDR/unavailable, so callers never
 * feature-detect themselves.
 *
 * probe() is idempotent -- only the 'unprobed' state triggers a new
 * probe -- and never checks the browser's UA or version for toneMapping
 * support directly, since no such feature check exists; the accepted
 * fallback is a silent clamp that renders visually identical to
 * normalized SDR on an engine that lacks the feature. Once a device is
 * acquired it is not re-probed automatically: device.lost degrades gpu
 * back to 'unavailable' and it stays there for the rest of the session.
 */
@Service()
export class HdrDisplayService {
  private readonly hdrMediaQuery =
    typeof matchMedia === 'function' ? matchMedia('(dynamic-range: high)') : null;

  private readonly _displayIsHdr = signal(this.hdrMediaQuery?.matches ?? false);
  readonly displayIsHdr = this._displayIsHdr.asReadonly();

  private readonly _gpu = signal<'unprobed' | 'probing' | GPUDevice | 'unavailable'>('unprobed');
  readonly gpu = this._gpu.asReadonly();

  constructor() {
    // Guarded: jsdom implements neither matchMedia nor a 'change' event
    // on it, so every spec exercises the SDR fallback path with zero
    // stubbing (hermetic-test MUST).
    this.hdrMediaQuery?.addEventListener('change', (event) => {
      this._displayIsHdr.set(event.matches);
    });
  }

  /**
   * Lazily probes for a WebGPU device on the first headroom-palette
   * load. Idempotent: only the 'unprobed' state triggers a new probe,
   * so a device lost mid-session (see below) is never re-probed
   * automatically.
   *
   * @returns Resolves once the gpu signal has settled.
   */
  async probe(): Promise<void> {
    if (this._gpu() !== 'unprobed') return;
    this._gpu.set('probing');

    // Guarded: no per-UA-version gating for the Chrome < 129 toneMapping
    // gap -- there is no direct feature check, and the worst case is a
    // silent clamp visually equal to normalized SDR (accepted).
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      this._gpu.set('unavailable');
      return;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        this._gpu.set('unavailable');
        return;
      }
      const device = await adapter.requestDevice();
      device.lost.then(() => {
        this._gpu.set('unavailable');
      });
      this._gpu.set(device);
    } catch {
      this._gpu.set('unavailable');
    }
  }
}
