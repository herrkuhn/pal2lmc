// Imperative WebGPU renderer for the HDR grid underlay -- constructed
// and destroyed by PaletteGridComponent, never a component itself. No
// Angular imports and no imports from src/app/core/: ConversionService's
// hdrPreviewColors passthrough (DL-005) pre-encodes every color into
// extended-sRGB floats, so this module contains no color math and its
// untestable surface is pinned to exactly the WebGPU calls themselves.

const COLUMNS = 16;
const ROWS = 4;
const CELL_COUNT = COLUMNS * ROWS;
// Matches PaletteGridComponent's CSS grid `gap: 2px`, reproduced here as
// alpha-0 gutters (HDR plan DL-004).
const GAP_CSS_PX = 2;
const CANVAS_FORMAT: GPUTextureFormat = 'rgba16float';

/** Extended-sRGB-encoded color ready for upload; components may exceed
 *  1.0 for headroom content, matching ConversionService.hdrPreviewColors'
 *  output. */
interface HdrColor {
  r: number;
  g: number;
  b: number;
}

/** One cell's bounding box in device pixels, top-left origin. */
interface DeviceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes per-cell device-pixel rects for a `columns` x `rows` grid
 * with `gapCssPx` CSS-pixel gutters scaled to device pixels by `dpr`.
 * Pure and shared by the fragment shader's uv-to-cell math (HDR plan
 * DL-004), so a jsdom unit test can pin the geometry without any WebGPU
 * call.
 *
 * @param widthPx - Canvas backing-store width in device pixels.
 * @param heightPx - Canvas backing-store height in device pixels.
 * @param dpr - Device pixel ratio used to scale gapCssPx.
 * @param columns - Grid column count.
 * @param rows - Grid row count.
 * @param gapCssPx - CSS-pixel gap between cells.
 * @returns One rect per cell, row-major (index = row * columns + col).
 */
export function computeCellRects(
  widthPx: number,
  heightPx: number,
  dpr: number,
  columns: number,
  rows: number,
  gapCssPx: number,
): DeviceRect[] {
  const gapPx = Math.round(gapCssPx * dpr);
  const cellWidth = (widthPx - gapPx * (columns - 1)) / columns;
  const cellHeight = (heightPx - gapPx * (rows - 1)) / rows;

  const rects: DeviceRect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      rects.push({
        x: col * (cellWidth + gapPx),
        y: row * (cellHeight + gapPx),
        width: cellWidth,
        height: cellHeight,
      });
    }
  }
  return rects;
}

const VERTEX_ENTRY = 'vs_main';
const FRAGMENT_ENTRY = 'fs_main';

// uv-to-cell math mirrors computeCellRects exactly, so the two never
// drift apart: cellSize/gapPx/columns/rows travel as uniforms rather
// than being recomputed independently in WGSL.
const SHADER_SOURCE = `
struct Uniforms {
  cellSize: vec2<f32>,
  gapPx: f32,
  columns: f32,
  rows: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> colors: array<vec4<f32>>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
};

@vertex
fn ${VERTEX_ENTRY}(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0),
  );
  var out: VertexOutput;
  out.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  return out;
}

@fragment
fn ${FRAGMENT_ENTRY}(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let colStep = uniforms.cellSize.x + uniforms.gapPx;
  let rowStep = uniforms.cellSize.y + uniforms.gapPx;
  let col = floor(position.x / colStep);
  let row = floor(position.y / rowStep);
  let localX = position.x - col * colStep;
  let localY = position.y - row * rowStep;

  if (localX > uniforms.cellSize.x || localY > uniforms.cellSize.y ||
      col >= uniforms.columns || row >= uniforms.rows) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  let index = u32(row * uniforms.columns + col);
  let color = colors[index];
  return vec4<f32>(color.rgb, 1.0);
}
`;

interface HdrGridRendererOptions {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  onFailure: () => void;
}

/**
 * Owns one canvas's WebGPU context, pipeline, and buffers for the HDR
 * grid underlay. A caller constructs one instance per canvas, calls
 * configure() once, then render() on every color update; destroy() tears
 * everything down and is safe to call more than once.
 *
 * One underlay canvas draws all 64 cells with a single fullscreen
 * triangle rather than 64 per-swatch canvases: each canvas would need
 * its own configured WebGPU context, multiplying setup cost and failure
 * surface by 64 for no benefit, since the fragment shader already maps a
 * uv coordinate to a cell index. Colors travel to the shader as a
 * storage buffer of vec4<f32> rather than an rgba16float texture upload:
 * a texture would require packing each color to f16 in JavaScript first,
 * extra work that buys nothing for 64 texels.
 */
export class HdrGridRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly device: GPUDevice;
  private readonly onFailure: () => void;

  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private colorBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastColors: HdrColor[] = [];
  private destroyed = false;
  private failed = false;
  // WebGPU validation errors from createShaderModule/createRenderPipeline
  // surface asynchronously via 'uncapturederror', not as thrown
  // exceptions, so the try/catch blocks in configure()/draw() alone
  // would miss them and silently leave a broken canvas.
  private readonly handleUncapturedError = (): void => {
    this.fail();
  };

  constructor(options: HdrGridRendererOptions) {
    this.canvas = options.canvas;
    this.device = options.device;
    this.onFailure = options.onFailure;
  }

  /**
   * Sets up the WebGPU context, pipeline, and buffers. Any throw or
   * rejection tears down and calls onFailure exactly once (never leaves
   * a broken black canvas).
   */
  configure(): void {
    try {
      const context = this.canvas.getContext('webgpu');
      if (!context) throw new Error('webgpu context unavailable');
      this.context = context;
      this.device.addEventListener('uncapturederror', this.handleUncapturedError);

      context.configure({
        device: this.device,
        format: CANVAS_FORMAT,
        colorSpace: 'srgb',
        toneMapping: { mode: 'extended' },
        alphaMode: 'premultiplied',
      });

      const shaderModule = this.device.createShaderModule({ code: SHADER_SOURCE });
      this.pipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: shaderModule, entryPoint: VERTEX_ENTRY },
        fragment: {
          module: shaderModule,
          entryPoint: FRAGMENT_ENTRY,
          targets: [{ format: CANVAS_FORMAT }],
        },
        primitive: { topology: 'triangle-list' },
      });

      this.uniformBuffer = this.device.createBuffer({
        size: 6 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this.colorBuffer = this.device.createBuffer({
        size: CELL_COUNT * 4 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      this.bindGroup = this.device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniformBuffer } },
          { binding: 1, resource: { buffer: this.colorBuffer } },
        ],
      });

      this.resizeObserver = new ResizeObserver(() => this.draw(this.lastColors));
      this.resizeObserver.observe(this.canvas);
    } catch {
      this.fail();
    }
  }

  /**
   * Uploads `colors` (64 extended-sRGB-encoded float triples from
   * ConversionService.hdrPreviewColors, DL-005) and issues one
   * fullscreen-triangle draw covering the whole grid.
   */
  render(colors: HdrColor[]): void {
    if (this.destroyed || this.failed) return;
    this.lastColors = colors;
    this.draw(colors);
  }

  private draw(colors: HdrColor[]): void {
    if (this.destroyed || this.failed) return;
    if (
      !this.context ||
      !this.pipeline ||
      !this.bindGroup ||
      !this.uniformBuffer ||
      !this.colorBuffer
    ) {
      return;
    }
    if (colors.length === 0) return;

    try {
      const dpr = window.devicePixelRatio || 1;
      const { widthPx, heightPx } = this.resizeBackingStore(dpr);
      this.writeGeometryUniforms(widthPx, heightPx, dpr);
      this.writeColorBuffer(colors);
      this.encodeAndSubmit(this.context, this.pipeline, this.bindGroup);
    } catch {
      this.fail();
    }
  }

  // Sizes the canvas backing store to clientSize x devicePixelRatio.
  private resizeBackingStore(dpr: number): { widthPx: number; heightPx: number } {
    const widthPx = Math.round(this.canvas.clientWidth * dpr);
    const heightPx = Math.round(this.canvas.clientHeight * dpr);
    this.canvas.width = widthPx;
    this.canvas.height = heightPx;
    return { widthPx, heightPx };
  }

  // Shares computeCellRects with the jsdom-tested geometry helper instead
  // of recomputing gap/cell math inline, so draw() -- covered only by
  // manual/recorded smoke -- can never drift from the pinned formula
  // computeCellRects.spec.ts exercises directly.
  private writeGeometryUniforms(widthPx: number, heightPx: number, dpr: number): void {
    const rects = computeCellRects(widthPx, heightPx, dpr, COLUMNS, ROWS, GAP_CSS_PX);
    const cellWidth = rects[0].width;
    const cellHeight = rects[0].height;
    const gapPx = rects[1].x - cellWidth;

    this.device.queue.writeBuffer(
      this.uniformBuffer!,
      0,
      new Float32Array([cellWidth, cellHeight, gapPx, COLUMNS, ROWS, 0]),
    );
  }

  private writeColorBuffer(colors: HdrColor[]): void {
    const colorData = new Float32Array(CELL_COUNT * 4);
    for (let i = 0; i < colors.length; i++) {
      colorData[i * 4] = colors[i].r;
      colorData[i * 4 + 1] = colors[i].g;
      colorData[i * 4 + 2] = colors[i].b;
      colorData[i * 4 + 3] = 1;
    }
    this.device.queue.writeBuffer(this.colorBuffer!, 0, colorData);
  }

  private encodeAndSubmit(
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bindGroup: GPUBindGroup,
  ): void {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  private fail(): void {
    if (this.failed) return;
    this.failed = true;
    this.destroy();
    this.onFailure();
  }

  /** Safe to call twice: a second call is a no-op. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.device.removeEventListener('uncapturederror', this.handleUncapturedError);
    this.context?.unconfigure();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.uniformBuffer?.destroy();
    this.colorBuffer?.destroy();
    this.uniformBuffer = null;
    this.colorBuffer = null;
    this.context = null;
    this.pipeline = null;
    this.bindGroup = null;
  }
}
