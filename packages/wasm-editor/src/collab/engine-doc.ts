// The engine as the collab client sees it: the raw exports shared by
// editor.wasm and canvas.wasm (docs/COLLAB.md, "The client"). Reads local
// edits out of the undo log, applies other people's, and keeps the table of
// their selections.

import {
  ATTR_MASK,
  Builder,
  LINK_MASK,
  LINK_SHIFT,
  LOW_MASK,
  compactLinks,
  compose,
  linkOf,
  withUrls,
  type CellSource,
  type Doc,
  type Op,
} from './ot.ts';

export interface CollabExports {
  memory: WebAssembly.Memory;
  scratch(bytes: number): number;
  length(): number;
  anchor(): number;
  focus(): number;
  set_selection(anchor: number, focus: number): void;
  cells(): number;
  read_cells(pos: number, n: number): number;
  intern_link(n: number): number;
  link_ptr(id: number): number;
  link_len(id: number): number;
  clear_history(): void;
  set_collab(on: number): void;
  undo_ptr(): number;
  undo_bytes(): number;
  journal_lost(): number;
  undo_request(): number;
  set_undo_state(bits: number): void;
  apply_insert(pos: number, n: number, who: number): number;
  apply_delete(pos: number, n: number): number;
  apply_format(pos: number, n: number, mask: number, value: number): number;
  load_cells(n: number): void;
  remote_ptr(): number;
  remote_count(): number;
  set_remote_count(n: number): void;
}

/** One local transaction. */
export interface LocalChange {
  op: Op;
  /** Undoes `op`, applied to the document `op` produced. */
  inverse: Op;
  /** Selection before and after. */
  before: [number, number];
  after: [number, number];
  /** The code unit, when this was one character typed at a caret (not a line break); else -1. */
  typed: number;
}

/** Someone else's selection as the engine draws it. */
export interface RemoteCursor {
  a: number;
  f: number;
  /** 0xRRGGBB */
  color: number;
}

const decoder = new TextDecoder('utf-16le');
export const REMOTE_MAX = 64;

export class EngineDoc implements CellSource {
  readonly x: CollabExports;

  constructor(x: CollabExports) {
    this.x = x;
  }

  get length(): number {
    return this.x.length();
  }

  get selection(): [number, number] {
    return [this.x.anchor(), this.x.focus()];
  }

  url(id: number): string {
    if (!id) return '';
    const len = this.x.link_len(id);
    if (!len) return '';
    return decoder.decode(new Uint8Array(this.x.memory.buffer, this.x.link_ptr(id), len * 2));
  }

  /** The local id for `url`, 0 if it is unsafe or the link table is full. */
  intern(url: string): number {
    if (!url) return 0;
    const ptr = this.x.scratch(url.length * 2);
    const view = new Uint16Array(this.x.memory.buffer, ptr, url.length);
    for (let i = 0; i < url.length; i++) view[i] = url.charCodeAt(i);
    return this.x.intern_link(url.length);
  }

  read(pos: number, n: number): Uint32Array {
    const got = this.x.read_cells(pos, n);
    return new Uint32Array(this.x.memory.buffer, this.x.scratch(0), got).slice();
  }

  /** The whole document, links as URLs. */
  doc(): Doc {
    const n = this.x.cells();
    const cells = new Uint32Array(this.x.memory.buffer, this.x.scratch(0), n).slice();
    const ins = withUrls(cells, this);
    return { cells: ins.i, links: ins.l ?? [] };
  }

  /** Replace the document (history, selection and remote cursors too). */
  load(doc: Doc): void {
    doc = compactLinks(doc);
    const ids = doc.links.map((u) => this.intern(u));
    const n = doc.cells.length;
    this.writeCells(doc.cells, ids);
    this.x.load_cells(n);
  }

  /** Apply someone else's operation. `who` is its author's remote cursor, or -1. */
  apply(op: Op, who = -1): void {
    let p = 0;
    for (const c of op) {
      if (typeof c === 'number') {
        p += c;
      } else if ('d' in c) {
        this.x.apply_delete(p, c.d);
      } else if ('i' in c) {
        const ids = (c.l ?? []).map((u) => this.intern(u));
        this.writeCells(c.i, ids);
        this.x.apply_insert(p, c.i.length, who);
        p += c.i.length;
      } else {
        let v = c.v & ATTR_MASK;
        if ((c.m & LINK_MASK) !== 0) v |= this.intern(c.l ?? '') << LINK_SHIFT;
        this.x.apply_format(p, c.f, c.m | 0, v | 0);
        p += c.f;
      }
    }
  }

  /** Write cells at OUT, turning their 1-based link indices into local ids. */
  private writeCells(cells: ArrayLike<number>, ids: number[]): void {
    const n = cells.length;
    const view = new Uint32Array(this.x.memory.buffer, this.x.scratch(n * 4), n);
    for (let j = 0; j < n; j++) {
      const c = cells[j];
      const k = linkOf(c);
      view[j] = ((c & LOW_MASK) | ((k ? (ids[k - 1] ?? 0) : 0) << LINK_SHIFT)) >>> 0;
    }
  }

  // --- local edits ---------------------------------------------------------

  /**
   * Read and clear the undo log: every transaction the local user made since
   * the last call. `lost` means records were dropped, so the changes are
   * incomplete and the caller has to resynchronise some other way.
   */
  drain(): { changes: LocalChange[]; lost: boolean } {
    const lost = this.x.journal_lost() === 1;
    const bytes = this.x.undo_bytes();
    if (!bytes) return { changes: [], lost };
    const words = new Int32Array(this.x.memory.buffer, this.x.undo_ptr(), bytes >> 2).slice();
    this.x.clear_history();
    if (lost) return { changes: [], lost };

    // record offsets, and the document length before the first
    const at: number[] = [];
    let len = this.x.length();
    for (let w = 0; w < words.length; w += words[w]) {
      at.push(w);
      const kind = words[w + 1];
      if (kind === 3) len -= words[w + 3];
      else if (kind === 4) len += words[w + 3];
    }

    const changes: LocalChange[] = [];
    let op: Op | null = null;
    let inverse: Op | null = null;
    let before: [number, number] = [0, 0];
    let records = 0;
    let typed = -1;
    for (const w of at) {
      const kind = words[w + 1];
      const a = words[w + 2];
      const b = words[w + 3];
      if (kind === 1) {
        op = inverse = null;
        before = [a, b];
        records = 0;
        typed = -1;
      } else if (kind === 2) {
        if (op && inverse) {
          const one =
            records === 1 && typed >= 0 && before[0] === before[1] && a === b && a === before[0] + 1 ? typed : -1;
          changes.push({ op, inverse, before, after: [a, b], typed: one });
        }
        op = inverse = null;
      } else {
        const [rop, rinv, next] = this.record(kind, a, b, words, w + 4, len);
        op = op ? compose(op, rop) : rop;
        inverse = inverse ? compose(rinv, inverse) : rinv;
        len = next;
        records++;
        typed = kind === 3 && b === 1 && (words[w + 4] & 0xffff) !== 10 ? words[w + 4] & 0xffff : -1;
      }
    }
    return { changes, lost: false };
  }

  /** One log record over a document of `len` cells: [op, inverse, length after]. */
  private record(kind: number, p: number, n: number, words: Int32Array, payload: number, len: number): [Op, Op, number] {
    const cells = (from: number) => {
      const out = new Array<number>(n);
      for (let j = 0; j < n; j++) out[j] = words[from + j] >>> 0;
      return out;
    };
    if (kind === 3) {
      const ins = withUrls(cells(payload), this);
      return [
        new Builder().retain(p).insert(ins.i, ins.l).retain(len - p).done(),
        new Builder().retain(p).delete(n).retain(len - p).done(),
        len + n,
      ];
    }
    if (kind === 4) {
      const ins = withUrls(cells(payload), this);
      return [
        new Builder().retain(p).delete(n).retain(len - p - n).done(),
        new Builder().retain(p).insert(ins.i, ins.l).retain(len - p - n).done(),
        len - n,
      ];
    }
    // SET: n old cells then n new ones
    const olds = cells(payload);
    const news = cells(payload + n);
    const fwd = new Builder().retain(p);
    const back = new Builder().retain(p);
    for (let j = 0; j < n; j++) {
      const o = olds[j];
      const c = news[j];
      if (((o ^ c) & 0xffff) !== 0) {
        const nc = withUrls([c], this);
        const oc = withUrls([o], this);
        fwd.delete(1).insert(nc.i, nc.l);
        back.delete(1).insert(oc.i, oc.l);
        continue;
      }
      const d = (o ^ c) >>> 0;
      let m = d & ATTR_MASK;
      if ((d & LINK_MASK) !== 0) m = (m | LINK_MASK) >>> 0;
      const link = (m & LINK_MASK) !== 0;
      fwd.format(1, m, c & m & ATTR_MASK, link ? this.url(linkOf(c)) : undefined);
      back.format(1, m, o & m & ATTR_MASK, link ? this.url(linkOf(o)) : undefined);
    }
    return [fwd.retain(len - p - n).done(), back.retain(len - p - n).done(), len];
  }

  // --- remote cursors ------------------------------------------------------

  get remote(): RemoteCursor[] {
    const n = this.x.remote_count();
    const view = new Int32Array(this.x.memory.buffer, this.x.remote_ptr(), n * 4);
    const out: RemoteCursor[] = [];
    for (let i = 0; i < n; i++) out.push({ a: view[i * 4], f: view[i * 4 + 1], color: view[i * 4 + 2] >>> 0 });
    return out;
  }

  set remote(cursors: RemoteCursor[]) {
    const n = Math.min(REMOTE_MAX, cursors.length);
    const view = new Int32Array(this.x.memory.buffer, this.x.remote_ptr(), n * 4);
    for (let i = 0; i < n; i++) {
      view[i * 4] = cursors[i].a;
      view[i * 4 + 1] = cursors[i].f;
      view[i * 4 + 2] = cursors[i].color | 0;
      view[i * 4 + 3] = 0;
    }
    this.x.set_remote_count(n);
  }
}
