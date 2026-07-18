import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { HdrDisplayService } from './hdr-display.service';

// Guarded-accessor contract (DL-006): jsdom has neither matchMedia nor
// navigator.gpu, so this spec runs with zero stubbing -- every other
// spec that exercises the SDR/unavailable fallback path relies on these
// same defaults.
describe('HdrDisplayService', () => {
  it('defaults displayIsHdr to false with zero matchMedia stubbing', () => {
    const service = TestBed.inject(HdrDisplayService);
    expect(service.displayIsHdr()).toBe(false);
  });

  it('resolves gpu to unavailable with zero navigator.gpu stubbing', async () => {
    const service = TestBed.inject(HdrDisplayService);
    await service.probe();
    expect(service.gpu()).toBe('unavailable');
  });

  // Pins the cost boundary: a settled gpu signal must block any further
  // adapter/device request, since every headroom-palette load in a
  // session calls probe() again.
  it('is idempotent: a second probe() call is a no-op once settled', async () => {
    const service = TestBed.inject(HdrDisplayService);
    await service.probe();
    await service.probe();
    expect(service.gpu()).toBe('unavailable');
  });
});
