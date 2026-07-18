import { describe, expect, it, vi } from 'vitest';
import { computeCellRects, HdrGridRenderer } from './hdr-grid-renderer';

const COLUMNS = 16;
const ROWS = 4;
const GAP_CSS_PX = 2;

describe('computeCellRects', () => {
  it.each([1, 2])('tiles a 320x80 canvas with no overlap and gap-equivalent gutters at DPR %i', (dpr) => {
    const width = 320 * dpr;
    const height = 80 * dpr;
    const rects = computeCellRects(width, height, dpr, COLUMNS, ROWS, GAP_CSS_PX);

    expect(rects.length).toBe(COLUMNS * ROWS);

    const gapPx = Math.round(GAP_CSS_PX * dpr);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const rect = rects[row * COLUMNS + col];
        if (col > 0) {
          const prev = rects[row * COLUMNS + col - 1];
          expect(rect.x - (prev.x + prev.width)).toBeCloseTo(gapPx, 5);
        }
        if (row > 0) {
          const above = rects[(row - 1) * COLUMNS + col];
          expect(rect.y - (above.y + above.height)).toBeCloseTo(gapPx, 5);
        }
      }
    }

    const last = rects[rects.length - 1];
    expect(last.x + last.width).toBeCloseTo(width, 5);
    expect(last.y + last.height).toBeCloseTo(height, 5);
  });

  it('tiles an odd-sized canvas (321x81) with no overlap', () => {
    const rects = computeCellRects(321, 81, 1, COLUMNS, ROWS, GAP_CSS_PX);
    expect(rects.length).toBe(COLUMNS * ROWS);
    for (let i = 1; i < COLUMNS; i++) {
      expect(rects[i].x).toBeGreaterThanOrEqual(rects[i - 1].x + rects[i - 1].width);
    }
  });
});

describe('HdrGridRenderer failure path', () => {
  // A device stub whose first call in configure() throws, standing in
  // for any WebGPU failure without needing a real adapter -- exercises
  // the tear-down/onFailure path that a real browser would only hit
  // under lost-context or validation-error conditions.
  function buildThrowingDevice(): GPUDevice {
    return {
      // Real GPUDevice implements EventTarget; configure()/destroy() add
      // and remove an 'uncapturederror' listener regardless of where
      // failure occurs, so the stub needs both to reach the intended
      // failure point (createShaderModule) instead of failing earlier.
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      createShaderModule: () => {
        throw new Error('boom');
      },
      createRenderPipeline: vi.fn(),
      createBuffer: vi.fn(),
      createBindGroup: vi.fn(),
      queue: { writeBuffer: vi.fn(), submit: vi.fn() },
    } as unknown as GPUDevice;
  }

  function buildCanvasStub(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      configure: vi.fn(),
      unconfigure: vi.fn(),
      getCurrentTexture: vi.fn(),
    } as unknown as GPUCanvasContext);
    return canvas;
  }

  it('calls onFailure exactly once when a WebGPU call throws, and destroy() is idempotent', () => {
    const canvas = buildCanvasStub();
    const device = buildThrowingDevice();
    const onFailure = vi.fn();
    const context = canvas.getContext('webgpu') as unknown as { unconfigure: () => void };

    const renderer = new HdrGridRenderer({ canvas, device, onFailure });
    renderer.configure();

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(context.unconfigure).toHaveBeenCalledTimes(1);

    renderer.destroy();
    renderer.destroy();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(context.unconfigure).toHaveBeenCalledTimes(1);
  });
});
