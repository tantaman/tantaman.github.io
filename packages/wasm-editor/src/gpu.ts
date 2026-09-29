// WebGPU renderer for canvas.wasm's display list (init flag 8).
//
// In this mode the module paints no pixels. Each frame it lists what it would
// have painted as 64-byte records (see src/wat/ui-draw.wat): rectangles,
// rounded rectangles, line segments and glyphs. Every record is one instanced
// quad here, and the fragment shader works out each pixel's coverage the way
// the module's pixel code does. Glyphs are rasterized straight from the signed
// distance fields in the font atlas, which is uploaded once, so neither side
// keeps a glyph cache. A frame costs 64 bytes per record to upload instead of
// 4 bytes per pixel, and the GPU does all the blending.

const SHADER = /* wgsl */ `
struct Prim {
  rect: vec4<i32>,  // quad: x, y, w, h in device px
  clip0: u32,       // clip x0 | y0 << 16
  clip1: u32,       // clip x1 | y1 << 16
  color: u32,       // RGBA bytes
  kind: u32,        // 0 rect, 1 rounded rect, 2 segment, 3 glyph
  p: array<u32, 8>,
}

@group(0) @binding(0) var<uniform> screen: vec2<f32>;
@group(0) @binding(1) var<storage, read> prims: array<Prim>;
@group(0) @binding(2) var<storage, read> font: array<u32>;

struct Varying {
  @builtin(position) pos: vec4<f32>,
  @location(0) @interpolate(flat) id: u32,
}

@vertex
fn vs(@builtin(vertex_index) v: u32, @builtin(instance_index) id: u32) -> Varying {
  let p = prims[id];
  let lo = max(p.rect.xy, vec2<i32>(i32(p.clip0 & 0xffffu), i32(p.clip0 >> 16u)));
  let hi = max(lo, min(p.rect.xy + p.rect.zw, vec2<i32>(i32(p.clip1 & 0xffffu), i32(p.clip1 >> 16u))));
  let corner = vec2<f32>(select(lo, hi, vec2<bool>((v & 1u) != 0u, (v & 2u) != 0u)));
  var out: Varying;
  out.pos = vec4<f32>(corner.x / screen.x * 2.0 - 1.0, 1.0 - corner.y / screen.y * 2.0, 0.0, 1.0);
  out.id = id;
  return out;
}

fn param(p: Prim, k: u32) -> f32 {
  return bitcast<f32>(p.p[k]);
}

// A distance field texel; outside the cell is "far outside".
fn texel(base: u32, tw: i32, th: i32, u: i32, v: i32) -> f32 {
  if (u < 0 || v < 0 || u >= tw || v >= th) {
    return 0.0;
  }
  let a = base + u32(v * tw + u);
  return f32((font[a >> 2u] >> ((a & 3u) * 8u)) & 0xffu);
}

// Coverage of pixel px, before clamping; mirrors $fill, $rrect, $line and
// $raster in ui-draw.wat.
fn coverage(p: Prim, px: vec2<i32>) -> f32 {
  switch p.kind {
    case 0u: {
      return 1.0;
    }
    case 1u: {
      let r = i32(p.p[0]);
      let l = px - p.rect.xy;
      var i = -1;
      var j = -1;
      if (l.x < r) { i = l.x; } else if (l.x >= p.rect.z - r) { i = p.rect.z - 1 - l.x; }
      if (l.y < r) { j = l.y; } else if (l.y >= p.rect.w - r) { j = p.rect.w - 1 - l.y; }
      if (i < 0 || j < 0) {
        return 1.0;
      }
      let rf = f32(r);
      let dx = rf - (f32(i) + 0.5);
      let dy = rf - (f32(j) + 0.5);
      return rf - sqrt(dx * dx + dy * dy) + 0.5;
    }
    case 2u: {
      let a = vec2<f32>(param(p, 0u), param(p, 1u));
      let d = vec2<f32>(param(p, 2u), param(p, 3u)) - a;
      let c = vec2<f32>(px) + 0.5;
      let len2 = max(0.0001, d.x * d.x + d.y * d.y);
      let t = clamp(((c.x - a.x) * d.x + (c.y - a.y) * d.y) / len2, 0.0, 1.0);
      let e = a + t * d - c;
      return param(p, 4u) - sqrt(e.x * e.x + e.y * e.y) + 0.5;
    }
    default: {
      let tw = i32(p.p[1] & 0xffffu);
      let th = i32(p.p[1] >> 16u);
      let k = param(p, 2u);
      let ij = vec2<f32>(px - p.rect.xy);
      let u = (ij.x + 0.5 - param(p, 3u)) / k - 0.5;
      let v = (ij.y + 0.5 - param(p, 4u)) / k - 0.5;
      let u0 = i32(floor(u));
      let v0 = i32(floor(v));
      let tu = u - f32(u0);
      let tv = v - f32(v0);
      let base = p.p[0];
      let s00 = texel(base, tw, th, u0, v0);
      let s10 = texel(base, tw, th, u0 + 1, v0);
      let s01 = texel(base, tw, th, u0, v0 + 1);
      let s11 = texel(base, tw, th, u0 + 1, v0 + 1);
      let s = (s00 + (s10 - s00) * tu) * (1.0 - tv) + (s01 + (s11 - s01) * tu) * tv;
      return (s - 128.0) * param(p, 5u) + param(p, 6u);
    }
  }
}

@fragment
fn fs(in: Varying) -> @location(0) vec4<f32> {
  let p = prims[in.id];
  let cov = round(clamp(coverage(p, vec2<i32>(floor(in.pos.xy))), 0.0, 1.0) * 255.0);
  if (cov == 0.0) {
    discard;
  }
  // as $blend: coverage n of 255 mixes in n + n / 128 parts of 256
  return vec4<f32>(unpack4x8unorm(p.color).rgb, (cov + floor(cov / 128.0)) / 256.0);
}
`;

const RECORD = 64;
// GPUBufferUsage flags (TypeScript's DOM types have the WebGPU interfaces
// but not these constants)
const COPY_DST = 0x08;
const UNIFORM = 0x40;
const STORAGE = 0x80;

export class GpuRenderer {
  readonly device: GPUDevice;
  private readonly pipeline: GPURenderPipeline;
  private readonly view: GPUBuffer;
  private readonly font: GPUBuffer;
  private list: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;

  /**
   * `font` is the module's font atlas (font_ptr, font_size); `format` that of
   * the textures drawn into, which must not be an -srgb one: like the module,
   * the renderer blends sRGB values directly.
   */
  constructor(device: GPUDevice, font: Uint8Array, format: GPUTextureFormat) {
    this.device = device;
    const module = device.createShaderModule({ code: SHADER });
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: {
        module,
        entryPoint: 'fs',
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'zero', operation: 'add' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    });
    this.view = device.createBuffer({ size: 16, usage: UNIFORM | COPY_DST });
    // storage buffers are read as u32s, so round the atlas up to whole words
    const padded = new Uint8Array(Math.ceil(font.length / 4) * 4);
    padded.set(font);
    this.font = device.createBuffer({ size: padded.length, usage: STORAGE | COPY_DST });
    device.queue.writeBuffer(this.font, 0, padded);
  }

  /** Draw the `count` records at byte `ptr` of `memory` into `target`. */
  draw(target: GPUTexture, memory: ArrayBuffer, ptr: number, count: number) {
    const { device } = this;
    const bytes = count * RECORD;
    if (!this.list || this.list.size < bytes) {
      this.list?.destroy();
      let size = 64 * 1024;
      while (size < bytes) size *= 2;
      this.list = device.createBuffer({ size, usage: STORAGE | COPY_DST });
      this.bindGroup = device.createBindGroup({
        layout: this.pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.view } },
          { binding: 1, resource: { buffer: this.list } },
          { binding: 2, resource: { buffer: this.font } },
        ],
      });
    }
    if (bytes) device.queue.writeBuffer(this.list, 0, memory, ptr, bytes);
    device.queue.writeBuffer(this.view, 0, new Float32Array([target.width, target.height]));
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: target.createView(), loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' },
      ],
    });
    if (count) {
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(4, count);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  destroy() {
    this.list?.destroy();
    this.view.destroy();
    this.font.destroy();
  }
}

/** A WebGPU device, or null when the browser has none to give. */
export async function requestGpuDevice(): Promise<GPUDevice | null> {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    return (await adapter?.requestDevice()) ?? null;
  } catch {
    return null;
  }
}
