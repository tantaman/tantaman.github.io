// The sequencer (docs/COLLAB.md, "The sequencer"): puts every operation on
// one document in one order, rebases late ones over what was committed since
// they were made, and relays presence. Storage and sockets sit behind small
// interfaces so the same code runs in the Durable Object and in tests.

import {
  apply,
  compose,
  decodeOp,
  emptyDoc,
  encodeCells,
  encodeOp,
  lengths,
  transform,
  validate,
  type Doc,
  type Op,
  type WireOp,
} from './ot.ts';
import type { PeerInfo, ServerMsg, WireCommitted } from './protocol.ts';

export interface Committed {
  v: number;
  /** Client id and that client's sequence number. */
  c: string;
  s: number;
  op: Op;
}

/** Durable storage for one document. */
export interface Store {
  /** Current version and length, or null for a new document. */
  head(): { version: number; length: number } | null;
  snapshot(): { version: number; doc: Doc } | null;
  /** Committed operations after version `v`, oldest first. */
  opsAfter(v: number): Committed[];
  /** The version (client, seq) was committed at, if it was. */
  committedAt(client: string, seq: number): number | undefined;
  /** Version of the oldest stored operation. */
  oldest(): number | undefined;
  /** Record a commit and the length it leaves the document at, atomically. */
  append(entry: Committed, author: string, length: number): void;
  writeSnapshot(version: number, doc: Doc): void;
  /** Forget operations up to and including version `v`. */
  dropThrough(v: number): void;
}

export interface SequencerOptions {
  /** Operations kept in memory for rebasing; older bases must reload. Default 1,000. */
  window?: number;
  /** Operations since the snapshot that make compaction due. Default 2,000. */
  compactEvery?: number;
  /** Longest document accepted, in cells; the engine holds about 1M. Default 1,000,000. */
  maxLength?: number;
}

export type Received =
  | { kind: 'commit'; entry: Committed }
  | { kind: 'duplicate' }
  | { kind: 'reset'; reason: string };

export class Sequencer {
  version = 0;
  length = 1;
  readonly store: Store;
  private readonly windowSize: number;
  private readonly compactEvery: number;
  private readonly maxLength: number;
  /** The last windowSize commits, oldest first. */
  private window: Committed[] = [];
  private readonly recent = new Map<string, number>();
  private snapVersion = 0;

  constructor(store: Store, opts: SequencerOptions = {}) {
    this.store = store;
    this.windowSize = opts.window ?? 1000;
    this.compactEvery = opts.compactEvery ?? 2000;
    this.maxLength = opts.maxLength ?? 1_000_000;
    const head = store.head();
    if (head) {
      this.version = head.version;
      this.length = head.length;
    }
    this.snapVersion = store.snapshot()?.version ?? 0;
    this.window = store.opsAfter(Math.max(0, this.version - this.windowSize));
    for (const e of this.window) this.recent.set(`${e.c}:${e.s}`, e.v);
  }

  /** The document length at version `v`, if `v` is within the window. */
  private lengthAt(v: number): number | undefined {
    if (v === this.version) return this.length;
    const first = this.window[0];
    if (!first || v < first.v - 1 || v > this.version) return undefined;
    return lengths(this.window[v + 1 - first.v].op)[0];
  }

  /** An operation from a client, made against version `base`. */
  receive(client: string, seq: number, base: number, wire: unknown, author: string): Received {
    if (!Number.isInteger(seq) || !Number.isInteger(base)) return { kind: 'reset', reason: 'malformed' };
    const key = `${client}:${seq}`;
    if (this.recent.has(key) || this.store.committedAt(client, seq) !== undefined) return { kind: 'duplicate' };
    const len = this.lengthAt(base);
    if (len === undefined) return { kind: 'reset', reason: 'too far behind' };
    let op: Op | null;
    try {
      op = validate(decodeOp(wire as WireOp), len);
    } catch {
      op = null;
    }
    if (!op) return { kind: 'reset', reason: 'invalid operation' };
    for (const e of this.window) if (e.v > base) op = transform(op, e.op, false);
    const [inLen, outLen] = lengths(op);
    if (inLen !== this.length) return { kind: 'reset', reason: 'out of step' };
    // every copy must be able to hold the result, or the copies diverge
    if (outLen > this.maxLength && outLen > inLen) return { kind: 'reset', reason: 'document too large' };
    const entry: Committed = { v: this.version + 1, c: client, s: seq, op };
    this.store.append(entry, author, outLen);
    this.version = entry.v;
    this.length = outLen;
    this.window.push(entry);
    this.recent.set(key, entry.v);
    while (this.window.length > this.windowSize) {
      const old = this.window.shift()!;
      this.recent.delete(`${old.c}:${old.s}`);
    }
    return { kind: 'commit', entry };
  }

  /** What a client that knows up to `version` (-1: nothing) needs. */
  catchUp(version: number): { snapshot: { version: number; doc: Doc } | null; ops: Committed[] } {
    if (version >= 0 && version <= this.version) {
      const oldest = this.store.oldest();
      if (version >= this.snapVersion || (oldest !== undefined && version >= oldest - 1))
        return { snapshot: null, ops: this.store.opsAfter(version) };
    }
    const snapshot = this.store.snapshot() ?? { version: 0, doc: emptyDoc() };
    return { snapshot, ops: this.store.opsAfter(snapshot.version) };
  }

  get compactionDue(): boolean {
    return this.version - this.snapVersion >= this.compactEvery;
  }

  /** The document now. */
  current(): Doc {
    const snap = this.store.snapshot() ?? { version: 0, doc: emptyDoc() };
    const ops = this.store.opsAfter(snap.version);
    return ops.length ? apply(snap.doc, ops.map((e) => e.op).reduce(compose)) : snap.doc;
  }

  /** Fold the operations into a new snapshot and forget those older than the window. */
  compact(): void {
    if (this.version === this.snapVersion) return;
    this.store.writeSnapshot(this.version, this.current());
    this.snapVersion = this.version;
    this.store.dropThrough(this.version - this.windowSize);
  }
}

// ---------------------------------------------------------------------------
// Connections

/** What a connection remembers across hibernation (a WebSocket attachment). */
export interface ConnState {
  user: string;
  name: string;
  color: string;
  /** Client id, once it said hello. */
  client: string | null;
  /** Its selection at version v, once it sent one. */
  v: number;
  a: number;
  f: number;
  sel: boolean;
}

export interface Conn {
  readonly state: ConnState;
  send(msg: ServerMsg): void;
  /** Persist `state` after a change. */
  save(): void;
}

export interface RoomOptions {
  /** Every open connection. */
  conns(): Iterable<Conn>;
  /** Run `fn` after `ms`. */
  later(fn: () => void, ms: number): void;
  /** Broadcast batching interval. Default 20 ms. */
  tickMs?: number;
  /** Cells per snapshot message. Default 200,000. */
  snapCells?: number;
}

const PALETTE = [
  '#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#0090ff',
  '#3e63dd', '#8e4ec6', '#d6409f', '#ad7f58', '#29a383', '#6e56cf',
];

export function colorFor(user: string): string {
  let h = 2166136261;
  for (let i = 0; i < user.length; i++) h = Math.imul(h ^ user.charCodeAt(i), 16777619);
  return PALETTE[(h >>> 0) % PALETTE.length];
}

export function newConnState(user: string, name: string): ConnState {
  return { user, name, color: colorFor(user), client: null, v: 0, a: 0, f: 0, sel: false };
}

const peerOf = (s: ConnState): PeerInfo => ({ id: s.client!, name: s.name, color: s.color, v: s.v, a: s.a, f: s.f });
const wire = (e: Committed): WireCommitted => ({ v: e.v, c: e.c, s: e.s, op: encodeOp(e.op) });

export class Room {
  readonly seq: Sequencer;
  private readonly opts: RoomOptions;
  private pending: Committed[] = [];
  private moved = new Map<string, PeerInfo | { id: string; gone: true }>();
  private scheduled = false;

  constructor(seq: Sequencer, opts: RoomOptions) {
    this.seq = seq;
    this.opts = opts;
  }

  message(conn: Conn, msg: unknown): void {
    if (!msg || typeof msg !== 'object') return;
    const m = msg as Record<string, unknown>;
    if (m.t === 'hello') this.hello(conn, m.client, m.version);
    else if (m.t === 'op') this.op(conn, m.seq, m.base, m.op);
    else if (m.t === 'presence') this.presence(conn, m.v, m.a, m.f);
  }

  private hello(conn: Conn, client: unknown, version: unknown): void {
    if (typeof client !== 'string' || !client || client.length > 64) return;
    const state = conn.state;
    if (state.client && state.client !== client) this.moved.set(state.client, { id: state.client, gone: true });
    state.client = client;
    state.sel = false;
    conn.save();
    const { snapshot, ops } = this.seq.catchUp(typeof version === 'number' && Number.isInteger(version) ? version : -1);
    if (snapshot) {
      const size = this.opts.snapCells ?? 200_000;
      const cells = snapshot.doc.cells;
      const parts = Math.max(1, Math.ceil(cells.length / size));
      for (let part = 0; part < parts; part++)
        conn.send({
          t: 'snap',
          part,
          parts,
          version: snapshot.version,
          cells: encodeCells(cells.slice(part * size, (part + 1) * size)),
          ...(part === 0 ? { links: snapshot.doc.links } : {}),
        });
    }
    const peers: PeerInfo[] = [];
    for (const c of this.opts.conns()) if (c.state.client && c.state.client !== client && c.state.sel) peers.push(peerOf(c.state));
    conn.send({
      t: 'init',
      version: this.seq.version,
      snapshot: snapshot !== null,
      ops: ops.map(wire),
      you: { id: client, name: state.name, color: state.color },
      peers,
    });
  }

  private op(conn: Conn, seq: unknown, base: unknown, op: unknown): void {
    const client = conn.state.client;
    if (!client || typeof seq !== 'number' || typeof base !== 'number') return;
    const r = this.seq.receive(client, seq, base, op, conn.state.user);
    if (r.kind === 'reset') conn.send({ t: 'reset', reason: r.reason });
    else if (r.kind === 'commit') {
      this.pending.push(r.entry);
      this.schedule();
    }
  }

  private presence(conn: Conn, v: unknown, a: unknown, f: unknown): void {
    const s = conn.state;
    if (!s.client || !Number.isInteger(v) || !Number.isInteger(a) || !Number.isInteger(f)) return;
    Object.assign(s, { v, a, f, sel: true });
    conn.save();
    this.moved.set(s.client, peerOf(s));
    this.schedule();
  }

  /** A connection closed. */
  leave(conn: Conn): void {
    const client = conn.state.client;
    if (!client) return;
    for (const c of this.opts.conns()) if (c !== conn && c.state.client === client) return;
    this.moved.set(client, { id: client, gone: true });
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.opts.later(() => this.flush(), this.opts.tickMs ?? 20);
  }

  /** Send everything committed or moved since the last flush, one message of each per connection. */
  flush(): void {
    this.scheduled = false;
    const ops = this.pending.splice(0).map(wire);
    const moved = [...this.moved.values()];
    this.moved.clear();
    if (!ops.length && !moved.length) return;
    for (const c of this.opts.conns()) {
      const me = c.state.client;
      if (!me) continue;
      if (ops.length) c.send({ t: 'ops', ops });
      const peers = moved.filter((p) => p.id !== me);
      if (peers.length) c.send({ t: 'presence', peers });
    }
  }
}

// ---------------------------------------------------------------------------

/** A Store in memory, for tests and local development. */
export class MemoryStore implements Store {
  private ops: (Committed & { author: string })[] = [];
  private snap: { version: number; doc: Doc } | null = null;
  private meta: { version: number; length: number } | null = null;

  head() {
    return this.meta;
  }
  snapshot() {
    return this.snap;
  }
  opsAfter(v: number): Committed[] {
    return this.ops.filter((e) => e.v > v);
  }
  committedAt(client: string, seq: number): number | undefined {
    return this.ops.find((e) => e.c === client && e.s === seq)?.v;
  }
  oldest(): number | undefined {
    return this.ops[0]?.v;
  }
  append(entry: Committed, author: string, length: number): void {
    this.ops.push({ ...entry, author });
    this.meta = { version: entry.v, length };
  }
  writeSnapshot(version: number, doc: Doc): void {
    this.snap = { version, doc };
  }
  dropThrough(v: number): void {
    this.ops = this.ops.filter((e) => e.v > v);
  }
}
