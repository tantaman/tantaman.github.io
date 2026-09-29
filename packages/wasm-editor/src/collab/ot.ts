// Operations over the engine's cell sequence (docs/COLLAB.md).
//
// A cell is the engine's u32: a UTF-16 unit in bits 0-15, marks or block
// format in bits 16-20, a link in bits 21-28, a colour in bits 29-31. Link ids
// are local to each copy of a document, so inside an operation a cell's link
// bits index the URL list of the component carrying it (1-based, 0 = no link,
// so at most LINK_MAX URLs per list). Marks and colour are plain bits.
//
// An operation walks the whole document, component by component:
//   n                   retain n cells
//   {i, l?}             insert cells i, whose links index l
//   {d}                 delete d cells
//   {f, m, v, l?}       on f cells, rewrite bits m (within 16-31) to v; when m
//                       holds the link bits the cells link to l ("" unlinks)
// Retains, deletes and formats add up to the length of the document the
// operation applies to.

/** Marks (or block format) and colour: the bits a format sets as they are. */
export const ATTR_MASK = 0xe01f0000;
export const LINK_MASK = 0x1fe00000;
export const LINK_SHIFT = 21;
/** Most URLs one list can hold. */
export const LINK_MAX = 255;
/** A cell without its link. */
export const LOW_MASK = 0xe01fffff;

/** The link bits of a cell: a 1-based index into a URL list, or 0. */
export const linkOf = (c: number) => (c & LINK_MASK) >>> LINK_SHIFT;

export interface Insert {
  i: number[];
  l?: string[];
}
export interface Delete {
  d: number;
}
export interface Format {
  f: number;
  m: number;
  v: number;
  l?: string;
}
export type Component = number | Insert | Delete | Format;
export type Op = Component[];

type Kind = 'r' | 'i' | 'd' | 'f';

export function kindOf(c: Component): Kind {
  if (typeof c === 'number') return 'r';
  if ('i' in c) return 'i';
  if ('d' in c) return 'd';
  return 'f';
}

function sizeOf(c: Component): number {
  if (typeof c === 'number') return c;
  if ('i' in c) return c.i.length;
  if ('d' in c) return c.d;
  return c.f;
}

const u32 = (x: number) => x >>> 0;

/** Length of the document `op` applies to, and of the one it produces. */
export function lengths(op: Op): [number, number] {
  let input = 0;
  let output = 0;
  for (const c of op) {
    const n = sizeOf(c);
    const k = kindOf(c);
    if (k !== 'i') input += n;
    if (k !== 'd') output += n;
  }
  return [input, output];
}

export function isNoop(op: Op): boolean {
  return op.every((c) => typeof c === 'number');
}

// ---------------------------------------------------------------------------
// Building normalised operations

/** Appends components, merging neighbours of the same kind. */
export class Builder {
  private readonly out: Op = [];

  retain(n: number): this {
    if (n <= 0) return this;
    const last = this.out.length - 1;
    if (typeof this.out[last] === 'number') this.out[last] = (this.out[last] as number) + n;
    else this.out.push(n);
    return this;
  }

  delete(n: number): this {
    if (n <= 0) return this;
    const last = this.out[this.out.length - 1];
    if (last !== undefined && kindOf(last) === 'd') (last as Delete).d += n;
    else this.out.push({ d: n });
    return this;
  }

  insert(cells: number[], links?: string[]): this {
    if (!cells.length) return this;
    const last = this.out[this.out.length - 1];
    if (last !== undefined && kindOf(last) === 'i') {
      const prev = last as Insert;
      const merged = prev.l ? prev.l.slice() : [];
      const add = relink(cells, links, merged);
      prev.i = prev.i.concat(add);
      if (merged.length) prev.l = merged;
      return this;
    }
    const own: string[] = [];
    const add = relink(cells, links, own);
    this.out.push(own.length ? { i: add, l: own } : { i: add });
    return this;
  }

  format(n: number, m: number, v: number, l?: string): this {
    if (n <= 0) return this;
    m = u32(m & (ATTR_MASK | LINK_MASK));
    if ((m & LINK_MASK) !== 0) m = u32(m | LINK_MASK);
    if (m === 0) return this.retain(n);
    v = u32(v & m & ATTR_MASK);
    const url = (m & LINK_MASK) !== 0 ? (l ?? '') : undefined;
    const last = this.out[this.out.length - 1];
    if (last !== undefined && kindOf(last) === 'f') {
      const prev = last as Format;
      if (prev.m === m && prev.v === v && prev.l === url) {
        prev.f += n;
        return this;
      }
    }
    this.out.push(url === undefined ? { f: n, m, v } : { f: n, m, v, l: url });
    return this;
  }

  push(c: Component): this {
    if (typeof c === 'number') return this.retain(c);
    if ('i' in c) return this.insert(c.i, c.l);
    if ('d' in c) return this.delete(c.d);
    return this.format(c.f, c.m, c.v, c.l);
  }

  done(): Op {
    return this.out;
  }
}

/** Copy `cells` re-indexing their links from `from` into `into` (extended as needed). */
function relink(cells: number[], from: string[] | undefined, into: string[]): number[] {
  if (!from || !from.length) return cells.map((c) => u32(c & LOW_MASK));
  const map = new Map<number, number>();
  return cells.map((c) => {
    const k = linkOf(c);
    if (!k) return u32(c & LOW_MASK);
    let j = map.get(k);
    if (j === undefined) {
      const url = from[k - 1] ?? '';
      j = url ? indexOfOrAdd(into, url) : 0;
      map.set(k, j);
    }
    return u32((c & LOW_MASK) | (j << LINK_SHIFT));
  });
}

/** 1-based index of `url` in `list`, added if new; 0 when the list is full. */
function indexOfOrAdd(list: string[], url: string): number {
  const at = list.indexOf(url);
  if (at >= 0) return at + 1;
  if (list.length >= LINK_MAX) return 0;
  list.push(url);
  return list.length;
}

// ---------------------------------------------------------------------------
// Walking an operation a piece at a time

class Iter {
  private i = 0;
  private off = 0;
  private readonly op: Op;
  constructor(op: Op) {
    this.op = op;
  }

  hasNext(): boolean {
    return this.i < this.op.length;
  }

  kind(): Kind | undefined {
    return this.i < this.op.length ? kindOf(this.op[this.i]) : undefined;
  }

  /** What is left of the current component. */
  left(): number {
    return this.i < this.op.length ? sizeOf(this.op[this.i]) - this.off : Infinity;
  }

  /** Take up to `n` of the current component. */
  next(n = Infinity): Component {
    const c = this.op[this.i];
    const size = sizeOf(c);
    const k = Math.min(n, size - this.off);
    const from = this.off;
    if (from + k >= size) {
      this.i++;
      this.off = 0;
    } else {
      this.off += k;
    }
    if (typeof c === 'number') return k;
    if ('i' in c) return from === 0 && k === size ? c : { i: c.i.slice(from, from + k), l: c.l };
    if ('d' in c) return { d: k };
    return { f: k, m: c.m, v: c.v, l: c.l };
  }
}

// ---------------------------------------------------------------------------
// Compose and transform

/** One operation with the effect of `a` then `b`. */
export function compose(a: Op, b: Op): Op {
  const A = new Iter(a);
  const B = new Iter(b);
  const out = new Builder();
  while (A.hasNext() || B.hasNext()) {
    if (B.kind() === 'i') {
      out.push(B.next());
      continue;
    }
    if (A.kind() === 'd') {
      out.push(A.next());
      continue;
    }
    if (!A.hasNext() || !B.hasNext()) throw new Error('compose: length mismatch');
    const n = Math.min(A.left(), B.left());
    const ca = A.next(n);
    const cb = B.next(n);
    const ka = kindOf(ca);
    const kb = kindOf(cb);
    if (ka === 'r') {
      out.push(cb);
    } else if (ka === 'i') {
      if (kb === 'r') out.push(ca);
      else if (kb === 'f') {
        const ins = formatInsert(ca as Insert, cb as Format);
        out.insert(ins.i, ins.l);
      }
      // an insert then deleted leaves nothing
    } else {
      // format
      if (kb === 'r') out.push(ca);
      else if (kb === 'd') out.delete(n);
      else {
        const fa = ca as Format;
        const fb = cb as Format;
        const m = u32(fa.m | fb.m);
        const v = u32((fa.v & ~fb.m) | fb.v);
        const l = (fb.m & LINK_MASK) !== 0 ? fb.l : (fa.m & LINK_MASK) !== 0 ? fa.l : undefined;
        out.format(n, m, v, l);
      }
    }
  }
  return out.done();
}

function formatInsert(ins: Insert, f: Format): Insert {
  const links = ins.l ? ins.l.slice() : [];
  const keep = u32(~(f.m & ATTR_MASK));
  const setLink = (f.m & LINK_MASK) !== 0;
  const idx = setLink && f.l ? indexOfOrAdd(links, f.l) : 0;
  const cells = ins.i.map((c) => {
    let x = u32((c & keep) | (f.v & ATTR_MASK));
    if (setLink) x = u32((x & LOW_MASK) | (idx << LINK_SHIFT));
    return x;
  });
  return links.length ? { i: cells, l: links } : { i: cells };
}

/**
 * `a` rewritten to apply after `b`, both made against the same document.
 * `aFirst` says the sequencer ordered `a` before `b`: its inserts go first at
 * a shared position, and where both format the same bits of a cell, `b`
 * (the later one) wins.
 */
export function transform(a: Op, b: Op, aFirst: boolean): Op {
  const A = new Iter(a);
  const B = new Iter(b);
  const out = new Builder();
  while (A.hasNext() || B.hasNext()) {
    const ka = A.kind();
    const kb = B.kind();
    if (ka === 'i' && (aFirst || kb !== 'i')) {
      out.push(A.next());
      continue;
    }
    if (kb === 'i') {
      out.retain((B.next() as Insert).i.length);
      continue;
    }
    if (!A.hasNext() || !B.hasNext()) throw new Error('transform: length mismatch');
    const n = Math.min(A.left(), B.left());
    const ca = A.next(n);
    const cb = B.next(n);
    const kcb = kindOf(cb);
    if (kcb === 'd') continue; // the cells are gone, and whatever a did to them
    const kca = kindOf(ca);
    if (kca === 'r') out.retain(n);
    else if (kca === 'd') out.delete(n);
    else {
      const fa = ca as Format;
      if (kcb === 'r' || !aFirst) out.push(fa);
      else {
        const fb = cb as Format;
        let m = u32(fa.m & ~fb.m);
        if ((fb.m & LINK_MASK) !== 0) m = u32(m & ~LINK_MASK);
        out.format(n, m, fa.v & m, (m & LINK_MASK) !== 0 ? fa.l : undefined);
      }
    }
  }
  return out.done();
}

/**
 * Where position `pos` goes through `op`. At an insert exactly at `pos` it
 * stays before the new cells when `assoc` < 0, else moves after them; a
 * deleted range collapses to its start.
 */
export function transformPosition(pos: number, op: Op, assoc = -1): number {
  let i = 0;
  let o = 0;
  for (const c of op) {
    const k = kindOf(c);
    if (k === 'i') {
      if (i < pos || (i === pos && assoc > 0)) o += (c as Insert).i.length;
      else return o + (pos - i);
      continue;
    }
    const n = sizeOf(c);
    if (k === 'd') {
      if (pos < i + n) return o;
      i += n;
      continue;
    }
    if (pos < i + n) return o + (pos - i);
    i += n;
    o += n;
  }
  return o + (pos - i);
}

// ---------------------------------------------------------------------------
// Documents

/** Cells with their links resolved: link bits are 1-based ids into `links`. */
export interface Doc {
  cells: number[];
  links: string[];
}

/** Read access to a document's cells, whose link bits are ids `url` resolves. */
export interface CellSource {
  read(pos: number, n: number): ArrayLike<number>;
  url(id: number): string;
}

export function docSource(doc: Doc): CellSource {
  return {
    read: (pos, n) => doc.cells.slice(pos, pos + n),
    url: (id) => doc.links[id - 1] ?? '',
  };
}

export function emptyDoc(): Doc {
  return { cells: [10], links: [] };
}

/** Apply `op` to `doc`, returning a new document. */
export function apply(doc: Doc, op: Op): Doc {
  // make room for the URLs the operation brings, if it could need it
  let incoming = 0;
  for (const c of op) {
    if (typeof c !== 'object') continue;
    if ('i' in c) incoming += c.l?.length ?? 0;
    else if ('f' in c && c.l) incoming++;
  }
  if (doc.links.length + incoming > LINK_MAX) doc = compactLinks(doc);
  const links = doc.links.slice();
  const intern = (url: string | undefined) => (url ? indexOfOrAdd(links, url) : 0);
  const out: number[] = [];
  let i = 0;
  for (const c of op) {
    const k = kindOf(c);
    if (k === 'r') {
      const n = c as number;
      if (i + n > doc.cells.length) throw new Error('apply: past the end');
      for (let j = 0; j < n; j++) out.push(doc.cells[i + j]);
      i += n;
    } else if (k === 'd') {
      i += (c as Delete).d;
    } else if (k === 'i') {
      const ins = c as Insert;
      for (const cell of ins.i) {
        const idx = linkOf(cell);
        out.push(u32((cell & LOW_MASK) | (intern(idx ? ins.l?.[idx - 1] : undefined) << LINK_SHIFT)));
      }
    } else {
      const f = c as Format;
      if (i + f.f > doc.cells.length) throw new Error('apply: past the end');
      const keep = u32(~(f.m & ATTR_MASK));
      const id = (f.m & LINK_MASK) !== 0 ? intern(f.l) : -1;
      for (let j = 0; j < f.f; j++) {
        let x = u32((doc.cells[i + j] & keep) | (f.v & ATTR_MASK));
        if (id >= 0) x = u32((x & LOW_MASK) | (id << LINK_SHIFT));
        out.push(x);
      }
      i += f.f;
    }
  }
  if (i !== doc.cells.length) throw new Error(`apply: op covers ${i} of ${doc.cells.length} cells`);
  return { cells: out, links };
}

/** The operation undoing `op`, given the document `op` applies to. */
export function invert(op: Op, src: CellSource): Op {
  const out = new Builder();
  let i = 0;
  for (const c of op) {
    const k = kindOf(c);
    if (k === 'r') {
      out.retain(c as number);
      i += c as number;
    } else if (k === 'i') {
      out.delete((c as Insert).i.length);
    } else if (k === 'd') {
      const n = (c as Delete).d;
      const ins = withUrls(src.read(i, n), src);
      out.insert(ins.i, ins.l);
      i += n;
    } else {
      const f = c as Format;
      const old = src.read(i, f.f);
      for (let j = 0; j < f.f; j++) {
        const x = old[j];
        const id = linkOf(x);
        out.format(1, f.m, x & f.m & ATTR_MASK, (f.m & LINK_MASK) !== 0 ? (id ? src.url(id) : '') : undefined);
      }
      i += f.f;
    }
  }
  return out.done();
}

/** `doc` with only the URLs its cells use. */
export function compactLinks(doc: Doc): Doc {
  const ins = withUrls(doc.cells, docSource(doc));
  return { cells: ins.i, links: ins.l ?? [] };
}

/** Cells whose link bits are ids of `src`, re-indexed into their own URL list. */
export function withUrls(cells: ArrayLike<number>, src: Pick<CellSource, 'url'>): Insert {
  const links: string[] = [];
  const map = new Map<number, number>();
  const out = new Array<number>(cells.length);
  for (let j = 0; j < cells.length; j++) {
    const x = cells[j];
    const id = linkOf(x);
    let idx = 0;
    if (id) {
      const known = map.get(id);
      if (known !== undefined) idx = known;
      else {
        const url = src.url(id);
        idx = url ? indexOfOrAdd(links, url) : 0;
        map.set(id, idx);
      }
    }
    out[j] = u32((x & LOW_MASK) | (idx << LINK_SHIFT));
  }
  return links.length ? { i: out, l: links } : { i: out };
}

/**
 * Split `op` so that the first part inserts at most `max` cells:
 * compose(first, rest) has the effect of `op`. `rest` is null when no split
 * was needed.
 */
export function split(op: Op, max: number): [Op, Op | null] {
  const [inLen] = lengths(op);
  const first = new Builder();
  let weight = 0;
  let inPos = 0;
  let outPos = 0;
  for (let idx = 0; idx < op.length; idx++) {
    const c = op[idx];
    const k = kindOf(c);
    if (k === 'i') {
      const ins = c as Insert;
      if (weight + ins.i.length > max) {
        const take = Math.max(0, max - weight);
        first.insert(ins.i.slice(0, take), ins.l);
        first.retain(inLen - inPos);
        const rest = new Builder().retain(outPos + take).insert(ins.i.slice(take), ins.l);
        for (let j = idx + 1; j < op.length; j++) rest.push(op[j]);
        return [first.done(), rest.done()];
      }
      first.push(c);
      weight += ins.i.length;
      outPos += ins.i.length;
    } else if (k === 'd') {
      first.push(c);
      inPos += (c as Delete).d;
    } else {
      first.push(c);
      inPos += sizeOf(c);
      outPos += sizeOf(c);
    }
  }
  return [op, null];
}

// ---------------------------------------------------------------------------
// The wire form: inserted cells travel as their UTF-16 text plus runs of the
// upper 16 bits, which for plain text is about one byte per character.

export interface WireCells {
  /** The code units. */
  t: string;
  /** Runs of [count, cell >>> 16], omitted when every cell's upper half is 0. */
  a?: number[];
}
export type WireComponent = number | { i: WireCells; l?: string[] } | Delete | Format;
export type WireOp = WireComponent[];

export function encodeCells(cells: ArrayLike<number>): WireCells {
  let t = '';
  const a: number[] = [];
  let any = false;
  const CHUNK = 8192;
  for (let s = 0; s < cells.length; s += CHUNK) {
    const units: number[] = [];
    for (let j = s; j < Math.min(cells.length, s + CHUNK); j++) units.push(cells[j] & 0xffff);
    t += String.fromCharCode(...units);
  }
  for (let j = 0; j < cells.length; j++) {
    const hi = cells[j] >>> 16;
    if (hi) any = true;
    if (a.length && a[a.length - 1] === hi) a[a.length - 2]++;
    else a.push(1, hi);
  }
  return any ? { t, a } : { t };
}

export function decodeCells(w: WireCells): number[] {
  const n = w.t.length;
  const out = new Array<number>(n);
  let j = 0;
  if (w.a) {
    for (let r = 0; r + 1 < w.a.length; r += 2) {
      const hi = w.a[r + 1];
      for (let k = 0; k < w.a[r] && j < n; k++, j++) out[j] = u32((hi << 16) | w.t.charCodeAt(j));
    }
  }
  for (; j < n; j++) out[j] = w.t.charCodeAt(j);
  return out;
}

export function encodeOp(op: Op): WireOp {
  return op.map((c) => {
    if (typeof c === 'object' && 'i' in c) return c.l ? { i: encodeCells(c.i), l: c.l } : { i: encodeCells(c.i) };
    return c;
  });
}

export function decodeOp(w: WireOp): Op {
  return w.map((c) => {
    if (typeof c === 'object' && 'i' in c) return c.l ? { i: decodeCells(c.i), l: c.l } : { i: decodeCells(c.i) };
    return c;
  });
}

/**
 * Check an untrusted operation against a document of `len` cells: well formed,
 * the right length, and leaving the final terminator last and in place.
 * Returns a normalised copy, or null.
 */
export function validate(op: unknown, len: number): Op | null {
  if (!Array.isArray(op)) return null;
  const out = new Builder();
  let input = 0;
  for (const c of op) {
    if (typeof c === 'number') {
      if (!Number.isInteger(c) || c <= 0) return null;
      out.retain(c);
      input += c;
    } else if (c && typeof c === 'object' && 'i' in c) {
      const cells = (c as Insert).i;
      const links = (c as Insert).l;
      if (!Array.isArray(cells) || !cells.every((x) => Number.isInteger(x) && x >= 0 && x <= 0xffffffff)) return null;
      if (links !== undefined && (!Array.isArray(links) || !links.every((u) => typeof u === 'string'))) return null;
      out.insert(cells, links);
    } else if (c && typeof c === 'object' && 'd' in c) {
      const n = (c as Delete).d;
      if (!Number.isInteger(n) || n <= 0) return null;
      out.delete(n);
      input += n;
    } else if (c && typeof c === 'object' && 'f' in c) {
      const f = c as Format;
      if (!Number.isInteger(f.f) || f.f <= 0 || !Number.isInteger(f.m) || !Number.isInteger(f.v)) return null;
      if (f.l !== undefined && typeof f.l !== 'string') return null;
      out.format(f.f, f.m, f.v, f.l);
      input += f.f;
    } else return null;
  }
  if (input !== len) return null;
  const norm = out.done();
  // the last cell is the final terminator: nothing may delete it or insert after it
  const last = norm[norm.length - 1];
  if (last === undefined || kindOf(last) === 'i' || kindOf(last) === 'd') return null;
  return norm;
}
