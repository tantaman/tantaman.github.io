// A scripted host for canvas.wasm: it records what the module asks of the
// host and drives it with synthetic input. Used by the tests; set
// CANVAS_SNAPSHOTS=<dir> to also write PNGs of the framebuffer.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

export const Key = {
  Backspace: 1, Delete: 2, Enter: 3, Tab: 4, Escape: 5, Left: 6, Right: 7, Up: 8, Down: 9,
  Home: 10, End: 11, PageUp: 12, PageDown: 13,
} as const;
export const Mod = { Shift: 1, Ctrl: 2, Alt: 4, Meta: 8 } as const;

export interface CanvasExports {
  memory: WebAssembly.Memory;
  init(w: number, h: number, scale: number, flags: number): void;
  resize(w: number, h: number, scale: number): void;
  set_theme(dark: number): void;
  set_focus(focused: number, now: number): void;
  repaint(): void;
  fb_ptr(): number;
  out_ptr(): number;
  scratch(bytes: number): number;
  tick(now: number): number;
  load_markdown(n: number): void;
  markdown(): number;
  copy_text(): number;
  copy_html(): number;
  cut(now: number): void;
  paste(n: number, plain: number, now: number): void;
  text_input(n: number, now: number): void;
  ime_preedit(n: number, now: number): void;
  key_down(key: number, mods: number, now: number): number;
  mouse_down(x: number, y: number, button: number, mods: number, now: number): void;
  mouse_move(x: number, y: number, mods: number, now: number): void;
  mouse_up(x: number, y: number, button: number, mods: number, now: number): void;
  wheel(dx: number, dy: number): void;
  touch_start(x: number, y: number, now: number): void;
  touch_move(x: number, y: number, now: number): void;
  touch_end(x: number, y: number, now: number): number;
  touch_cancel(now: number): void;
  scroll_top(): number;
  anchor(): number;
  focus(): number;
  length(): number;
  set_selection(anchor: number, focus: number): void;
}

const wasm = new WebAssembly.Module(readFileSync(new URL('../src/canvas.wasm', import.meta.url)));

export class Host {
  x!: CanvasExports;
  presents: number[][] = [];
  cursors: number[] = [];
  ime: number[][] = [];
  urls: string[] = [];
  t = 10_000;

  readonly w: number;
  readonly h: number;
  readonly flags: number;

  constructor(w = 800, h = 600, scale = 1, flags = 0) {
    this.w = w;
    this.h = h;
    this.flags = flags;
    const instance = new WebAssembly.Instance(wasm, {
      host: {
        present: (x: number, y: number, w: number, h: number) => this.presents.push([x, y, w, h]),
        set_cursor: (k: number) => this.cursors.push(k),
        ime_rect: (x: number, y: number, w: number, h: number) => this.ime.push([x, y, w, h]),
        open_url: (ptr: number, n: number) => this.urls.push(this.units(ptr, n)),
      },
    });
    this.x = instance.exports as unknown as CanvasExports;
    this.x.init(w, h, scale, flags);
  }

  now(step = 16) {
    return (this.t += step);
  }

  units(ptr: number, n: number) {
    return String.fromCharCode(...new Uint16Array(this.x.memory.buffer, ptr, n));
  }

  put(text: string) {
    const ptr = this.x.scratch(text.length * 2);
    const view = new Uint16Array(this.x.memory.buffer, ptr, text.length);
    for (let i = 0; i < text.length; i++) view[i] = text.charCodeAt(i);
    return text.length;
  }

  out(n: number) {
    return this.units(this.x.out_ptr(), n);
  }

  load(markdown: string) {
    this.x.load_markdown(this.put(markdown));
    return this;
  }

  markdown() {
    return this.out(this.x.markdown());
  }

  type(text: string) {
    for (const ch of text) {
      if (ch === '\n') this.x.key_down(Key.Enter, 0, this.now());
      else this.x.text_input(this.put(ch), this.now());
    }
  }

  key(key: number | string, mods = 0) {
    return this.x.key_down(typeof key === 'string' ? key.charCodeAt(0) : key, mods, this.now());
  }

  click(x: number, y: number, mods = 0) {
    const t = this.now(1000); // far enough from the last click not to count as a double
    this.x.mouse_down(x, y, 0, mods, t);
    this.x.mouse_up(x, y, 0, mods, t);
  }

  /**
   * A finger down at (x, y), moved through `path`, then lifted `hold` ms
   * after the last move. Returns what touch_end asks of the host.
   */
  touch(x: number, y: number, path: number[][] = [], { gap = 1000, step = 16, hold = 0 } = {}) {
    this.x.touch_start(x, y, this.now(gap));
    for (const [px, py] of path) this.x.touch_move((x = px), (y = py), this.now(step));
    return this.x.touch_end(x, y, this.now(step + hold));
  }

  /** Where the caret for document position `p` is drawn: [x, y, w, h]. */
  caretAt(p: number) {
    this.x.set_selection(p, p);
    this.x.repaint();
    return this.caret;
  }

  /** Bounding box [x, y, w, h] of the pixels painted exactly `color`, or null. */
  box(color: number) {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    const px = new Uint32Array(this.x.memory.buffer, this.x.fb_ptr(), this.w * this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (px[y * this.w + x] === color) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  }

  get selection() {
    return [this.x.anchor(), this.x.focus()];
  }

  get selectedText() {
    return this.out(this.x.copy_text());
  }

  /** The caret as the module last reported it: [x, y, w, h]. */
  get caret() {
    return this.ime[this.ime.length - 1];
  }

  pixel(px: number, py: number) {
    return new DataView(this.x.memory.buffer).getUint32(this.x.fb_ptr() + (py * this.w + px) * 4, true);
  }

  /** Count pixels in a rectangle that differ from `color`. */
  ink(x0: number, y0: number, w: number, h: number, color: number) {
    let n = 0;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (this.pixel(x, y) !== color) n++;
    return n;
  }

  snapshot(name: string) {
    const dir = process.env.CANVAS_SNAPSHOTS;
    if (!dir) return;
    mkdirSync(dir, { recursive: true });
    const fb = new Uint8Array(this.x.memory.buffer, this.x.fb_ptr(), this.w * this.h * 4).slice();
    if (this.flags & 4) for (let i = 0; i < fb.length; i += 4) [fb[i], fb[i + 2], fb[i + 3]] = [fb[i + 2], fb[i], 255];
    writeFileSync(path.join(dir, `${name}.png`), encodePNG(this.w, this.h, fb));
  }
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePNG(w: number, h: number, rgba: Uint8Array) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}
