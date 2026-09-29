// Builds the font atlas that canvas.wat renders text from, as a WAT data
// segment. This is build-time data preparation, like baking a texture: the
// glyph outlines are turned into signed distance fields here once, and the
// hand-written WAT scales and rasterizes them at run time.
//
// Fonts (SIL Open Font License, from @fontsource): Source Serif 4 for text,
// IBM Plex Mono for code, IBM Plex Sans for the toolbar.
//
// Layout at FONT_BASE (little-endian, offsets relative to FONT_BASE):
//   0  u32 magic "SDF1"      4  u32 E, texels per em     8  u32 S, spread in texels
//  12  u32 face count       16  u32 glyphs per face     20  u32 cmap offset
//  24  u32 faces offset     28  u32 kern offset          32  u32 cmap size
//  36  u32 atlas size in bytes, header included
//  cmap   u16[cmap size]: code point -> glyph index (0 = the missing-glyph box)
//  faces  32 bytes each: f32 ascent, f32 descent, f32 underline position,
//         f32 underline thickness, f32 x-height, u32 glyph table offset, 2 pad
//         (metrics in ems; descent and underline position are positive = below)
//  glyphs 16 bytes each: f32 advance (em), i16 x, i16 y (cell top-left from the
//         pen position in texels, y down), u16 width, u16 height, u32 bitmap offset
//  kern   i8[95*95] per face, pairs of ASCII 32..126, thousandths of an em
//  bitmaps: one byte per texel, 128 + distance * 127 / S (inside positive)

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkitModule from 'fontkit';

const fontkit = fontkitModule.default ?? fontkitModule;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const FONT_BASE = 0x850000; // must match $FONT in src/wat/ui.wat
const E = 48;
const S = 6;
const CMAP_SIZE = 0x2400;

export const FACES = [
  ['source-serif-4', 'source-serif-4-latin-400-normal.woff'], // 0 text
  ['source-serif-4', 'source-serif-4-latin-700-normal.woff'], // 1 bold
  ['source-serif-4', 'source-serif-4-latin-400-italic.woff'], // 2 italic
  ['source-serif-4', 'source-serif-4-latin-700-italic.woff'], // 3 bold italic
  ['ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff'], // 4 code
  ['ibm-plex-sans', 'ibm-plex-sans-latin-500-normal.woff'], // 5 interface
];

const fontPath = ([pkg, file]) => path.join(root, 'node_modules/@fontsource', pkg, 'files', file);

// --- outlines to line segments (texel space, y down) -------------------------

function segmentsOf(commands, scale) {
  const segs = [];
  let sx = 0;
  let sy = 0;
  let x = 0;
  let y = 0;
  let open = false;
  const P = (px, py) => [px * scale, -py * scale];
  const line = (ax, ay, bx, by) => {
    if (ax !== bx || ay !== by) segs.push([ax, ay, bx, by]);
  };
  const close = () => {
    if (open) line(x, y, sx, sy);
    open = false;
  };
  for (const { command, args } of commands) {
    if (command === 'moveTo') {
      close();
      [x, y] = P(args[0], args[1]);
      [sx, sy] = [x, y];
      open = true;
    } else if (command === 'lineTo') {
      const [nx, ny] = P(args[0], args[1]);
      line(x, y, nx, ny);
      [x, y] = [nx, ny];
    } else if (command === 'quadraticCurveTo') {
      const [cx, cy] = P(args[0], args[1]);
      const [nx, ny] = P(args[2], args[3]);
      const n = 10;
      let px = x;
      let py = y;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        const qx = u * u * x + 2 * u * t * cx + t * t * nx;
        const qy = u * u * y + 2 * u * t * cy + t * t * ny;
        line(px, py, qx, qy);
        [px, py] = [qx, qy];
      }
      [x, y] = [nx, ny];
    } else if (command === 'bezierCurveTo') {
      const [c1x, c1y] = P(args[0], args[1]);
      const [c2x, c2y] = P(args[2], args[3]);
      const [nx, ny] = P(args[4], args[5]);
      const n = 14;
      let px = x;
      let py = y;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        const qx = u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * nx;
        const qy = u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ny;
        line(px, py, qx, qy);
        [px, py] = [qx, qy];
      }
      [x, y] = [nx, ny];
    } else if (command === 'closePath') {
      close();
    }
  }
  close();
  return segs;
}

/** Signed distance field for a set of segments; null for an empty glyph. */
function sdf(segs) {
  if (!segs.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [ax, ay, bx, by] of segs) {
    minX = Math.min(minX, ax, bx);
    maxX = Math.max(maxX, ax, bx);
    minY = Math.min(minY, ay, by);
    maxY = Math.max(maxY, ay, by);
  }
  const x0 = Math.floor(minX) - S;
  const y0 = Math.floor(minY) - S;
  const w = Math.ceil(maxX) - x0 + S;
  const h = Math.ceil(maxY) - y0 + S;
  const data = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    const py = y0 + j + 0.5;
    for (let i = 0; i < w; i++) {
      const px = x0 + i + 0.5;
      let best = Infinity;
      let winding = 0;
      for (const [ax, ay, bx, by] of segs) {
        const dx = bx - ax;
        const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
        const ex = ax + t * dx - px;
        const ey = ay + t * dy - py;
        const d = ex * ex + ey * ey;
        if (d < best) best = d;
        // nonzero winding for a ray towards +x
        if (ay <= py ? by > py : by <= py) {
          const cross = dx * (py - ay) - dy * (px - ax);
          if (by > ay ? cross > 0 : cross < 0) winding += by > ay ? 1 : -1;
        }
      }
      const dist = Math.sqrt(best) * (winding !== 0 ? 1 : -1);
      data[j * w + i] = Math.max(0, Math.min(255, Math.round(128 + (dist * 127) / S)));
    }
  }
  return { x: x0, y: y0, w, h, data };
}

/** The missing-glyph box: a rectangle outline 0.5em wide, cap height tall. */
function tofuSegments(capEm) {
  const r = (x1, y1, x2, y2) => [
    [x1, y1, x2, y1],
    [x2, y1, x2, y2],
    [x2, y2, x1, y2],
    [x1, y2, x1, y1],
  ];
  const t = 0.06 * E;
  const W = 0.5 * E;
  const H = capEm * E;
  const outer = r(0.05 * E, -H, 0.05 * E + W, 0);
  // inner rectangle wound the other way leaves a hole
  const inner = r(0.05 * E + t, -H + t, 0.05 * E + W - t, -t).map(([ax, ay, bx, by]) => [bx, by, ax, ay]);
  return [...outer, ...inner];
}

// --- the atlas -----------------------------------------------------------------

function build() {
  const fonts = FACES.map((f) => fontkit.openSync(fontPath(f)));
  // One glyph list shared by every face: index 0 is the missing-glyph box.
  const points = new Set();
  for (const font of fonts) {
    for (const cp of font.characterSet) {
      if (cp >= 0x20 && cp < CMAP_SIZE && !(cp >= 0x7f && cp < 0xa0)) points.add(cp);
    }
  }
  const codepoints = [...points].sort((a, b) => a - b);
  const nglyphs = codepoints.length + 1;

  const faceRecords = [];
  const glyphTables = [];
  const kernTables = [];
  const bitmaps = [];
  let bitmapBytes = 0;
  const addBitmap = (field) => {
    const offset = bitmapBytes;
    bitmaps.push(field.data);
    bitmapBytes += field.data.length;
    return offset;
  };

  for (const font of fonts) {
    const upem = font.unitsPerEm;
    const scale = E / upem;
    const glyphs = [];
    const tofu = sdf(tofuSegments((font.capHeight || 0.7 * upem) / upem));
    const tofuRecord = { adv: 0.6, field: tofu, offset: addBitmap(tofu) };
    glyphs.push(tofuRecord);
    for (const cp of codepoints) {
      if (!font.hasGlyphForCodePoint(cp)) {
        glyphs.push(tofuRecord);
        continue;
      }
      let adv;
      let commands;
      try {
        const glyph = font.glyphForCodePoint(cp);
        adv = glyph.advanceWidth / upem;
        commands = glyph.path.commands;
      } catch {
        // The subset keeps these code points but not their (empty) glyph
        // data. They are all spaces, so an advance is all they need.
        const digit = font.glyphForCodePoint(0x30).advanceWidth / upem;
        const mono = font.post?.isFixedPitch;
        const space = { 0x20: 0.25, 0xa0: 0.25, 0x2002: 0.5, 0x2009: 0.2, 0x200b: 0 }[cp];
        glyphs.push(space === undefined ? tofuRecord : { adv: mono && space ? digit : space, field: null, offset: 0 });
        continue;
      }
      const field = sdf(segmentsOf(commands, scale));
      glyphs.push({ adv, field, offset: field ? addBitmap(field) : 0 });
    }
    glyphTables.push(glyphs);

    const kern = new Int8Array(95 * 95);
    const noLigatures = { liga: false, clig: false, dlig: false, rlig: false, calt: false };
    for (let l = 32; l < 127; l++) {
      for (let r = 32; r < 127; r++) {
        let run;
        try {
          run = font.layout(String.fromCharCode(l, r), noLigatures);
        } catch {
          continue; // a stripped glyph (see above)
        }
        if (run.glyphs.length !== 2) continue;
        const k = ((run.positions[0].xAdvance - run.glyphs[0].advanceWidth) / upem) * 1000;
        kern[(l - 32) * 95 + (r - 32)] = Math.max(-128, Math.min(127, Math.round(k)));
      }
    }
    kernTables.push(kern);

    faceRecords.push({
      ascent: font.ascent / upem,
      descent: -font.descent / upem,
      underlinePosition: -(font.underlinePosition || -0.1 * upem) / upem,
      underlineThickness: (font.underlineThickness || 0.05 * upem) / upem,
      xHeight: (font.xHeight || 0.5 * upem) / upem,
    });
  }

  // assemble
  const HEADER = 40;
  const cmapOffset = HEADER;
  const facesOffset = cmapOffset + CMAP_SIZE * 2;
  const glyphsOffset = facesOffset + FACES.length * 32;
  const kernOffset = glyphsOffset + FACES.length * nglyphs * 16;
  const bitmapOffset = kernOffset + FACES.length * 95 * 95;
  const total = bitmapOffset + bitmapBytes;
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const bytes = new Uint8Array(out);
  dv.setUint32(0, 0x31464453, true); // "SDF1"
  dv.setUint32(4, E, true);
  dv.setUint32(8, S, true);
  dv.setUint32(12, FACES.length, true);
  dv.setUint32(16, nglyphs, true);
  dv.setUint32(20, cmapOffset, true);
  dv.setUint32(24, facesOffset, true);
  dv.setUint32(28, kernOffset, true);
  dv.setUint32(32, CMAP_SIZE, true);
  dv.setUint32(36, total, true);
  codepoints.forEach((cp, i) => dv.setUint16(cmapOffset + cp * 2, i + 1, true));
  faceRecords.forEach((f, i) => {
    const o = facesOffset + i * 32;
    dv.setFloat32(o, f.ascent, true);
    dv.setFloat32(o + 4, f.descent, true);
    dv.setFloat32(o + 8, f.underlinePosition, true);
    dv.setFloat32(o + 12, f.underlineThickness, true);
    dv.setFloat32(o + 16, f.xHeight, true);
    dv.setUint32(o + 20, glyphsOffset + i * nglyphs * 16, true);
  });
  glyphTables.forEach((glyphs, fi) => {
    glyphs.forEach((g, gi) => {
      const o = glyphsOffset + (fi * nglyphs + gi) * 16;
      dv.setFloat32(o, g.adv, true);
      if (g.field) {
        dv.setInt16(o + 4, g.field.x, true);
        dv.setInt16(o + 6, g.field.y, true);
        dv.setUint16(o + 8, g.field.w, true);
        dv.setUint16(o + 10, g.field.h, true);
        dv.setUint32(o + 12, bitmapOffset + g.offset, true);
      }
    });
  });
  kernTables.forEach((k, i) => bytes.set(new Uint8Array(k.buffer), kernOffset + i * 95 * 95));
  let at = bitmapOffset;
  for (const b of bitmaps) {
    bytes.set(b, at);
    at += b.length;
  }
  return bytes;
}

/** The atlas bytes, rebuilt only when the fonts or this script change. */
export function fontAtlas() {
  const hash = createHash('sha256');
  hash.update(readFileSync(fileURLToPath(import.meta.url)));
  for (const f of FACES) hash.update(readFileSync(fontPath(f)));
  const key = hash.digest('hex');
  const dir = path.join(root, '.cache');
  const file = path.join(dir, `font-atlas-${key.slice(0, 16)}.bin`);
  if (existsSync(file)) return new Uint8Array(readFileSync(file));
  const started = Date.now();
  const atlas = build();
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, atlas);
  console.log(`font atlas: ${atlas.length} bytes in ${Date.now() - started} ms`);
  return atlas;
}

/** WAT data segment placing the atlas at FONT_BASE. */
export async function fontDataSegment() {
  const atlas = fontAtlas();
  let text = '';
  for (let i = 0; i < atlas.length; i++) {
    const b = atlas[i];
    text += b >= 0x20 && b < 0x7f && b !== 0x22 && b !== 0x5c ? String.fromCharCode(b) : `\\${b.toString(16).padStart(2, '0')}`;
  }
  return `  (data (i32.const ${FONT_BASE}) "${text}")`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const atlas = fontAtlas();
  console.log(`atlas ${atlas.length} bytes`);
}
