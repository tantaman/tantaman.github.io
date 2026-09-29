// A software model of the WebGPU renderer (src/gpu.ts): it draws canvas.wasm's
// display list (init flag 8) into an RGBA buffer the way the shader does, one
// record at a time, working out each pixel's coverage per record kind. The
// tests compare it with the module's own framebuffer to check that the list
// holds everything the pixel code paints, with the same coverage.

export function drawList(memory: WebAssembly.Memory, listPtr: number, count: number, fontPtr: number, w: number, h: number) {
  const out = new Uint8Array(w * h * 4);
  const dv = new DataView(memory.buffer);
  const font = new Uint8Array(memory.buffer, fontPtr);
  for (let r = 0; r < count; r++) {
    const a = listPtr + r * 64;
    const x = dv.getInt32(a, true);
    const y = dv.getInt32(a + 4, true);
    const rw = dv.getInt32(a + 8, true);
    const rh = dv.getInt32(a + 12, true);
    const clip0 = dv.getUint32(a + 16, true);
    const clip1 = dv.getUint32(a + 20, true);
    const color = dv.getUint32(a + 24, true);
    const kind = dv.getUint32(a + 28, true);
    const u = (k: number) => dv.getUint32(a + 32 + k * 4, true);
    const f = (k: number) => dv.getFloat32(a + 32 + k * 4, true);
    // the quad, clipped (the vertex shader)
    const x0 = Math.max(x, clip0 & 0xffff);
    const y0 = Math.max(y, clip0 >>> 16);
    const x1 = Math.min(x + rw, clip1 & 0xffff, w);
    const y1 = Math.min(y + rh, clip1 >>> 16, h);
    const coverage = coverageOf(kind, x, y, rw, rh, u, f, font);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        // the fragment shader
        const cov = Math.round(Math.min(1, Math.max(0, coverage(px, py))) * 255);
        if (cov === 0) continue;
        const alpha = (cov + (cov >> 7)) / 256;
        const o = (py * w + px) * 4;
        for (let c = 0; c < 3; c++) {
          const s = (color >>> (c * 8)) & 0xff;
          out[o + c] = Math.round(out[o + c] + (s - out[o + c]) * alpha);
        }
        out[o + 3] = 255;
      }
    }
  }
  return out;
}

function coverageOf(
  kind: number, x: number, y: number, w: number, h: number,
  u: (k: number) => number, f: (k: number) => number, font: Uint8Array,
): (px: number, py: number) => number {
  if (kind === 0) return () => 1;
  if (kind === 1) {
    const r = u(0);
    return (px, py) => {
      const lx = px - x;
      const ly = py - y;
      const i = lx < r ? lx : lx >= w - r ? w - 1 - lx : -1;
      const j = ly < r ? ly : ly >= h - r ? h - 1 - ly : -1;
      if (i < 0 || j < 0) return 1;
      const dx = r - (i + 0.5);
      const dy = r - (j + 0.5);
      return r - Math.sqrt(dx * dx + dy * dy) + 0.5;
    };
  }
  if (kind === 2) {
    const [ax, ay, bx, by, half] = [f(0), f(1), f(2), f(3), f(4)];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = Math.max(0.0001, dx * dx + dy * dy);
    return (px, py) => {
      const cx = px + 0.5;
      const cy = py + 0.5;
      const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2));
      const ex = ax + t * dx - cx;
      const ey = ay + t * dy - cy;
      return half - Math.sqrt(ex * ex + ey * ey) + 0.5;
    };
  }
  const base = u(0);
  const tw = u(1) & 0xffff;
  const th = u(1) >>> 16;
  const [k, fx, fy, dscale, bias] = [f(2), f(3), f(4), f(5), f(6)];
  const texel = (tu: number, tv: number) => (tu < 0 || tv < 0 || tu >= tw || tv >= th ? 0 : font[base + tv * tw + tu]);
  return (px, py) => {
    const gu = (px - x + 0.5 - fx) / k - 0.5;
    const gv = (py - y + 0.5 - fy) / k - 0.5;
    const u0 = Math.floor(gu);
    const v0 = Math.floor(gv);
    const tu = gu - u0;
    const tv = gv - v0;
    const s00 = texel(u0, v0);
    const s10 = texel(u0 + 1, v0);
    const s01 = texel(u0, v0 + 1);
    const s11 = texel(u0 + 1, v0 + 1);
    const s = (s00 + (s10 - s00) * tu) * (1 - tv) + (s01 + (s11 - s01) * tu) * tv;
    return (s - 128) * dscale + bias;
  };
}
