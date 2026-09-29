// The collab client (docs/COLLAB.md, "The client"): keeps one engine instance
// in step with a document's sequencer. The host forwards the sequencer's
// messages to receive(), and calls afterLocal() after every call it makes
// into the engine, so local edits and undo requests are picked up at once.

import { EngineDoc, REMOTE_MAX, type CollabExports, type LocalChange, type RemoteCursor } from './engine-doc.ts';
import {
  ATTR_MASK,
  Builder,
  compose,
  decodeCells,
  decodeOp,
  encodeOp,
  invert,
  isNoop,
  split,
  transform,
  transformPosition,
  type Doc,
  type Op,
} from './ot.ts';
import type { ClientMsg, PeerInfo, ServerMsg, WireCommitted } from './protocol.ts';

export type CollabStatus = 'connecting' | 'synced' | 'saving' | 'offline';

export interface Peer {
  id: string;
  name: string;
  color: string;
}

export interface CollabClientOptions {
  /** One per tab; generated when omitted. */
  clientId?: string;
  send(msg: ClientMsg): void;
  /** The document or the remote cursors changed without a local edit: repaint. */
  onRemote?(): void;
  onStatus?(status: CollabStatus): void;
  /** Who else is here. */
  onPeers?(peers: Peer[]): void;
  /** Local changes were dropped because the document had to be reloaded. */
  onLost?(): void;
  /** Content to offer the sequencer when the document turns out to be empty on joining. */
  seed?: Doc;
  /** Inserted cells per operation sent; bigger edits go in several. Default 100,000. */
  maxInsert?: number;
  /** Minimum gap between presence messages. Default 200 ms. */
  presenceMs?: number;
  now?(): number;
  setTimer?(fn: () => void, ms: number): unknown;
  clearTimer?(timer: unknown): void;
}

interface Entry {
  op: Op;
  /** The selection to restore once `op` is applied. */
  sel: [number, number];
}

interface PeerState extends Peer {
  rgb: number;
  /** Index in the engine's remote cursor table, or -1. */
  slot: number;
}

const UNDO_MAX = 500;
/** Committed operations kept for placing presence that lags behind. */
const HISTORY = 512;

export function randomId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('');
}

export class CollabClient {
  readonly doc: EngineDoc;
  readonly id: string;
  /** The last committed version applied here; -1 before the first init. */
  version = -1;
  private readonly opts: CollabClientOptions;
  private seq = 0;
  /** Sent and not yet acknowledged; `socket` is the connection it went out on. */
  private awaiting: { seq: number; op: Op; socket: number } | null = null;
  private socket = 0;
  private buffer: Op | null = null;
  private connected = false;
  private ready = false;
  private joining = false;
  /** Engine length the client last saw, for rebuilding after a lost log. */
  private len: number;
  private undoStack: Entry[] = [];
  private redoStack: Entry[] = [];
  /** The last change was typing that ended here; `space` if it typed a space. */
  private typing: { at: number; space: boolean } | null = null;
  private history: { v: number; op: Op }[] = [];
  private readonly peers = new Map<string, PeerState>();
  private snapParts: { version: number; cells: number[]; links: string[] }[] = [];
  private sentSel: [number, number] | null = null;
  private lastPresence = -Infinity;
  private presenceTimer: unknown = null;
  private status: CollabStatus = 'connecting';
  private destroyed = false;

  constructor(x: CollabExports, opts: CollabClientOptions) {
    this.doc = new EngineDoc(x);
    this.opts = opts;
    this.id = opts.clientId ?? randomId();
    x.set_collab(1);
    this.len = this.doc.length;
  }

  // --- connection ----------------------------------------------------------

  /** The socket opened (again). */
  open(): void {
    this.connected = true;
    this.socket++;
    this.join();
  }

  /** The socket closed. Local edits keep collecting until it reopens. */
  close(): void {
    this.connected = false;
    this.joining = false;
    this.snapParts = [];
    this.sentSel = null;
    if (this.peers.size) {
      this.peers.clear();
      this.doc.remote = [];
      this.opts.onPeers?.([]);
      this.opts.onRemote?.();
    }
    this.setStatus('offline');
  }

  destroy(): void {
    this.destroyed = true;
    if (this.presenceTimer !== null) this.opts.clearTimer?.(this.presenceTimer);
    this.doc.remote = [];
    this.doc.x.set_collab(0);
  }

  private join(): void {
    if (!this.connected) return;
    this.joining = true;
    this.snapParts = [];
    this.opts.send({ t: 'hello', client: this.id, version: this.ready ? this.version : -1 });
  }

  receive(msg: ServerMsg): void {
    if (this.destroyed) return;
    switch (msg.t) {
      case 'snap':
        this.snapParts[msg.part] = { version: msg.version, cells: decodeCells(msg.cells), links: msg.links ?? [] };
        break;
      case 'init':
        this.init(msg);
        break;
      case 'ops':
        if (this.joining || !this.ready) break;
        this.committedBatch(msg.ops);
        break;
      case 'presence':
        if (!this.ready) break;
        this.presenceIn(msg.peers);
        break;
      case 'reset':
        this.ready = false;
        this.version = -1;
        this.join();
        break;
    }
  }

  private init(msg: Extract<ServerMsg, { t: 'init' }>): void {
    this.joining = false;
    if (msg.snapshot) {
      const cells = this.snapParts.flatMap((p) => p.cells);
      const links = this.snapParts[0]?.links ?? [];
      const version = this.snapParts[0]?.version ?? 0;
      this.snapParts = [];
      if (this.awaiting || this.buffer) this.opts.onLost?.();
      this.doc.load({ cells: cells.length ? cells : [10], links } satisfies Doc);
      this.len = this.doc.length;
      // the operations in this message follow the snapshot
      this.version = version;
      this.awaiting = null;
      this.buffer = null;
      this.undoStack = [];
      this.redoStack = [];
      this.history = [];
      this.typing = null;
      this.syncUndoState();
    }
    this.ready = true;
    this.peers.clear();
    this.doc.remote = [];
    this.committedBatch(msg.ops);
    this.presenceIn(msg.peers);
    this.offerSeed();
    // an operation sent on an earlier socket and not among these was never committed
    if (this.awaiting && this.awaiting.socket !== this.socket) this.sendOp(this.awaiting.seq, this.awaiting.op);
    else this.flush();
    this.sentSel = null;
    this.presence();
    this.updateStatus();
    this.opts.onRemote?.();
  }

  /** The seed comes back like anyone else's edit, so nothing here waits for it. */
  private offerSeed(): void {
    const seed = this.opts.seed;
    if (!seed || seed.cells.length < 2 || this.doc.length !== 1 || this.awaiting || this.buffer) return;
    const last = seed.cells[seed.cells.length - 1];
    const op = new Builder()
      .insert(seed.cells.slice(0, -1), seed.links)
      .format(1, ATTR_MASK, last & ATTR_MASK)
      .done();
    this.opts.send({ t: 'seed', op: encodeOp(op) });
  }

  // --- committed operations ------------------------------------------------

  private committedBatch(ops: WireCommitted[]): void {
    let changed = false;
    for (const w of ops) {
      if (w.v <= this.version) continue;
      if (w.v !== this.version + 1) {
        this.join(); // missed some: ask for them again
        return;
      }
      if (this.committed(w)) changed = true;
    }
    this.flush();
    this.presence();
    this.updateStatus();
    if (changed) {
      this.syncUndoState();
      this.opts.onRemote?.();
    }
  }

  /** One committed operation. Returns true if the document changed. */
  private committed(w: WireCommitted): boolean {
    const op = decodeOp(w.op);
    this.version = w.v;
    this.history.push({ v: w.v, op });
    if (this.history.length > HISTORY) this.history.shift();
    if (this.awaiting && w.c === this.id && w.s === this.awaiting.seq) {
      this.awaiting = null; // the batch's caller sends what is buffered
      return false;
    }
    // rebase it over what is still ours: awaiting, then buffered
    let s = op;
    if (this.awaiting) {
      const a = transform(this.awaiting.op, s, false);
      s = transform(s, this.awaiting.op, true);
      this.awaiting.op = a;
    }
    if (this.buffer) {
      const b = transform(this.buffer, s, false);
      s = transform(s, this.buffer, true);
      this.buffer = b;
    }
    if (isNoop(s)) return false;
    this.doc.apply(s, this.peers.get(w.c)?.slot ?? -1);
    this.len = this.doc.length;
    // what was last sent moves with the text, so a remote edit alone sends no presence
    if (this.sentSel) this.sentSel = [transformPosition(this.sentSel[0], s), transformPosition(this.sentSel[1], s)];
    this.transformStack(this.undoStack, s);
    this.transformStack(this.redoStack, s);
    this.typing = null;
    return true;
  }

  /** Move a history stack past `s`, which applies to the document its top entry applies to. */
  private transformStack(stack: Entry[], s: Op): void {
    let x = s;
    for (let i = stack.length - 1; i >= 0; i--) {
      const e = stack[i];
      const op = transform(e.op, x, false);
      x = transform(x, e.op, true);
      e.op = op;
      // the selection belongs to the document after e is applied, where x now applies
      e.sel = [transformPosition(e.sel[0], x), transformPosition(e.sel[1], x)];
    }
    for (let i = stack.length - 1; i >= 0; i--) if (isNoop(stack[i].op)) stack.splice(i, 1);
  }

  // --- local edits ---------------------------------------------------------

  /** Pick up whatever the last call into the engine did. */
  afterLocal(): void {
    if (this.destroyed) return;
    const x = this.doc.x;
    const request = x.undo_request();
    const { changes, lost } = this.doc.drain();
    if (lost) this.rebuild();
    for (const change of changes) this.local(change);
    if (request === 1) this.step(this.undoStack, this.redoStack);
    else if (request === 2) this.step(this.redoStack, this.undoStack);
    this.len = this.doc.length;
    if (changes.length || lost || request) {
      this.syncUndoState();
      this.updateStatus();
    }
    this.presence();
  }

  private local(change: LocalChange): void {
    if (isNoop(change.op)) return;
    const top = this.undoStack[this.undoStack.length - 1];
    if (change.typed >= 0 && top && this.typing && !this.typing.space && this.typing.at === change.before[0]) {
      top.op = compose(change.inverse, top.op); // one undo step per word
    } else {
      this.undoStack.push({ op: change.inverse, sel: change.before });
      if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
    }
    this.typing = change.typed >= 0 ? { at: change.after[0], space: change.typed === 32 } : null;
    this.redoStack = [];
    this.submit(change.op);
  }

  /** Undo (from undo to redo) or redo (from redo to undo). */
  private step(from: Entry[], to: Entry[]): void {
    const e = from.pop();
    if (!e) return;
    const inverse = invert(e.op, this.doc);
    const sel = this.doc.selection;
    this.doc.apply(e.op);
    this.doc.x.set_selection(e.sel[0], e.sel[1]);
    to.push({ op: inverse, sel });
    this.typing = null;
    this.submit(e.op);
    this.opts.onRemote?.();
  }

  /** The log lost records: send the whole document as a replacement. */
  private rebuild(): void {
    const now = this.doc.doc();
    const last = now.cells[now.cells.length - 1];
    const op = new Builder()
      .delete(this.len - 1)
      .insert(now.cells.slice(0, -1), now.links)
      .format(1, ATTR_MASK, last & ATTR_MASK)
      .done();
    this.undoStack = [];
    this.redoStack = [];
    this.typing = null;
    this.submit(op);
  }

  private submit(op: Op): void {
    this.buffer = this.buffer ? compose(this.buffer, op) : op;
    this.flush();
  }

  /** Send the buffer if nothing is awaiting acknowledgement. */
  private flush(): void {
    while (!this.awaiting && this.buffer && this.connected && this.ready && !this.joining) {
      const [first, rest] = split(this.buffer, this.opts.maxInsert ?? 100_000);
      this.buffer = rest;
      if (!isNoop(first)) this.sendOp(++this.seq, first);
    }
    this.updateStatus();
  }

  private sendOp(seq: number, op: Op): void {
    this.awaiting = { seq, op, socket: this.socket };
    if (this.connected && this.ready && !this.joining)
      this.opts.send({ t: 'op', seq, base: this.version, op: encodeOp(op) });
  }

  private syncUndoState(): void {
    this.doc.x.set_undo_state((this.undoStack.length ? 1 : 0) | (this.redoStack.length ? 2 : 0));
  }

  get pending(): boolean {
    return this.awaiting !== null || this.buffer !== null;
  }

  private updateStatus(): void {
    this.setStatus(!this.connected ? 'offline' : !this.ready ? 'connecting' : this.pending ? 'saving' : 'synced');
  }

  private setStatus(status: CollabStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.opts.onStatus?.(status);
  }

  // --- presence ------------------------------------------------------------

  /** Send the local selection when it changed, in committed coordinates. */
  private presence(): void {
    if (!this.connected || !this.ready || this.joining || this.pending) return;
    const sel = this.doc.selection;
    if (this.sentSel && sel[0] === this.sentSel[0] && sel[1] === this.sentSel[1]) return;
    const now = this.opts.now?.() ?? Date.now();
    const wait = (this.opts.presenceMs ?? 200) - (now - this.lastPresence);
    if (wait > 0) {
      if (this.presenceTimer === null && this.opts.setTimer)
        this.presenceTimer = this.opts.setTimer(() => {
          this.presenceTimer = null;
          this.presence();
        }, wait);
      return;
    }
    this.lastPresence = now;
    this.sentSel = sel;
    this.opts.send({ t: 'presence', v: this.version, a: sel[0], f: sel[1] });
  }

  private presenceIn(list: (PeerInfo | { id: string; gone: true })[]): void {
    const placed = new Map<string, [number, number]>();
    let roster = false;
    for (const p of list) {
      if (p.id === this.id) continue;
      if ('gone' in p) {
        roster = this.peers.delete(p.id) || roster;
        continue;
      }
      if (!this.peers.has(p.id)) roster = true;
      const known = this.peers.get(p.id);
      this.peers.set(p.id, { id: p.id, name: p.name, color: p.color, rgb: parseColor(p.color), slot: known?.slot ?? -1 });
      const at = this.place(p);
      if (at) placed.set(p.id, at);
    }
    this.writeCursors(placed);
    if (roster) this.opts.onPeers?.(this.peerList());
    this.opts.onRemote?.();
  }

  peerList(): Peer[] {
    return [...this.peers.values()].map(({ id, name, color }) => ({ id, name, color }));
  }

  /** A peer's selection moved into local coordinates, or null if it can't be yet. */
  private place(p: PeerInfo): [number, number] | null {
    if (p.v > this.version) return null;
    let a = p.a;
    let f = p.f;
    if (p.v < this.version) {
      const first = this.history.findIndex((h) => h.v === p.v + 1);
      if (first < 0) return null;
      for (let i = first; i < this.history.length; i++) {
        a = transformPosition(a, this.history[i].op);
        f = transformPosition(f, this.history[i].op);
      }
    }
    for (const op of [this.awaiting?.op, this.buffer]) {
      if (!op) continue;
      a = transformPosition(a, op);
      f = transformPosition(f, op);
    }
    return [a, f];
  }

  /** Rewrite the engine's cursor table: placed peers at their new places, the rest where the engine moved them. */
  private writeCursors(placed: Map<string, [number, number]>): void {
    const current = this.doc.remote;
    const cursors: RemoteCursor[] = [];
    for (const p of this.peers.values()) {
      const at = placed.get(p.id) ?? (p.slot >= 0 && current[p.slot] ? [current[p.slot].a, current[p.slot].f] : null);
      if (!at || cursors.length >= REMOTE_MAX) {
        p.slot = -1;
        continue;
      }
      p.slot = cursors.length;
      cursors.push({ a: at[0], f: at[1], color: p.rgb });
    }
    this.doc.remote = cursors;
  }
}

function parseColor(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  return m ? parseInt(m[1], 16) : 0x3b82f6;
}
