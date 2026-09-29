// Collaborative documents for the canvas editor (packages/wasm-editor/docs/COLLAB.md).
//
// One EditorDoc Durable Object per document id sequences every edit. Its own SQLite holds the
// operations and the snapshot, so nothing on the editing path leaves the object; output gates hold
// each broadcast until the commit it carries is durable. Presence lives in the WebSocket
// attachments and is never stored. An optional D1 binding (COLLAB_DB, migrations-collab/) gets a
// debounced index row per document for listing and search. The communal DEMO_DOC starts over once
// it has been left alone for DEMO_RESET_MS: the next visitor finds it empty and seeds it again.
//
// The sequencing itself is packages/wasm-editor/src/collab/server-core.ts, which the tests and the
// editor's dev server run too; this file is storage and sockets. Auth and routing are
// collab-http.ts.

import { DurableObject } from "cloudflare:workers";

import { decodeOp, encodeOp, type Doc, type WireOp } from "../../packages/wasm-editor/src/collab/ot.ts";
import {
  Room,
  Sequencer,
  newConnState,
  type Committed,
  type Conn,
  type ConnState,
  type Store,
} from "../../packages/wasm-editor/src/collab/server-core.ts";

export interface CollabEnv {
  COLLAB_DOCS: DurableObjectNamespace<EditorDoc>;
  /** Optional: the document index (migrations-collab/). */
  COLLAB_DB?: D1Database;
}

/** Cells per snapshot row: a Durable Object value is at most 2 MB. */
const PART_CELLS = 256 * 1024;
/** How long after the last edit the index row is written. */
const INDEX_DELAY_MS = 10_000;
/** Largest message accepted from a client. */
const MAX_MESSAGE = 4 * 1024 * 1024;
/** The document /wasm-editor/canvas opens, which anyone may edit (collab-http.ts). */
export const DEMO_DOC = "demo";
/** How long the demo stays as its last visitor left it. */
const DEMO_RESET_MS = 30 * 60 * 1000;

export class EditorDoc extends DurableObject<CollabEnv> {
  private room: Room | null = null;
  private readonly conns = new WeakMap<WebSocket, Conn>();

  constructor(ctx: DurableObjectState, env: CollabEnv) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS op (
      version INTEGER PRIMARY KEY, client TEXT NOT NULL, seq INTEGER NOT NULL, author TEXT NOT NULL,
      op TEXT NOT NULL, UNIQUE (client, seq))`);
    sql.exec("CREATE TABLE IF NOT EXISTS snapshot_part (part INTEGER PRIMARY KEY, cells BLOB NOT NULL)");
    sql.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  }

  /** The room, built on first use after the object wakes (hibernation drops memory, not sockets). */
  private get live(): Room {
    this.room ??= new Room(new Sequencer(new SqlStore(this.ctx.storage)), {
      conns: () => this.ctx.getWebSockets().map((ws) => this.conn(ws)),
      later: (fn, ms) => setTimeout(fn, ms),
    });
    return this.room;
  }

  private conn(ws: WebSocket): Conn {
    let conn = this.conns.get(ws);
    if (!conn) {
      let state = (ws.deserializeAttachment() as ConnState | null) ?? newConnState("", "");
      conn = {
        get state() {
          return state;
        },
        send: (msg) => {
          try {
            ws.send(JSON.stringify(msg));
          } catch {
            // closing: its close handler takes it out of the room
          }
        },
        save: () => ws.serializeAttachment(state),
      };
      this.conns.set(ws, conn);
    }
    return conn;
  }

  async fetch(request: Request): Promise<Response> {
    const user = request.headers.get("x-collab-user");
    const doc = request.headers.get("x-collab-doc");
    if (!user || !doc) return new Response("bad request", { status: 400 });
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO meta (key, value) VALUES ('doc', ?)", doc);
    // someone is here: the demo keeps what it has
    this.ctx.storage.sql.exec("DELETE FROM meta WHERE key = 'reset_at'");
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(newConnState(user, request.headers.get("x-collab-name") ?? "someone"));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    if (message.length > MAX_MESSAGE) {
      ws.close(1009, "message too big");
      return;
    }
    let msg: unknown;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    const room = this.live;
    const before = room.seq.version;
    room.message(this.conn(ws), msg);
    if (room.seq.version !== before) await this.alarmBy(Date.now() + INDEX_DELAY_MS);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.live.leave(this.conn(ws));
    try {
      ws.close(code, reason);
    } catch {
      // already closed
    }
    await this.leftAlone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.live.leave(this.conn(ws));
    await this.leftAlone(ws);
  }

  /** `gone` left: if that was the demo's last visitor, start its reset clock. */
  private async leftAlone(gone: WebSocket): Promise<void> {
    if (this.docId() !== DEMO_DOC || this.present(gone)) return;
    const at = Date.now() + DEMO_RESET_MS;
    this.ctx.storage.sql.exec(
      "INSERT INTO meta (key, value) VALUES ('reset_at', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
      String(at),
    );
    await this.alarmBy(at);
  }

  /** Anyone connected besides `except`. */
  private present(except?: WebSocket): boolean {
    return this.ctx.getWebSockets().some((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private docId(): string | undefined {
    return this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM meta WHERE key = 'doc'").toArray()[0]?.value;
  }

  /** Make sure the alarm goes off by `at`; one alarm serves the index and the demo's reset. */
  private async alarmBy(at: number): Promise<void> {
    const set = await this.ctx.storage.getAlarm();
    if (set === null || at < set) await this.ctx.storage.setAlarm(at);
  }

  /** Forget everything but the document's id; the next visitor seeds it again. */
  private reset(): void {
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("DELETE FROM op");
      this.ctx.storage.sql.exec("DELETE FROM snapshot_part");
      this.ctx.storage.sql.exec("DELETE FROM meta WHERE key <> 'doc'");
    });
    this.room = null;
  }

  /** Quiet for a while after edits: compact if due, and write the index row. Also the demo's reset. */
  async alarm(): Promise<void> {
    const resetAt = Number(
      this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM meta WHERE key = 'reset_at'").toArray()[0]?.value ?? 0,
    );
    if (resetAt && resetAt <= Date.now() && !this.present()) this.reset();
    else if (resetAt) await this.alarmBy(resetAt);
    const seq = this.live.seq;
    if (seq.compactionDue) seq.compact();
    const db = this.env.COLLAB_DB;
    const id = this.docId();
    if (!db || !id) return;
    const text = plainText(seq.current());
    const title = text.split("\n").find((line) => line.trim())?.trim().slice(0, 120) ?? "";
    await db
      .prepare(
        `INSERT INTO collab_doc (id, title, text, version, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (id) DO UPDATE SET title = ?2, text = ?3, version = ?4, updated_at = ?5`,
      )
      .bind(id, title, text.slice(0, 200_000), seq.version, Date.now())
      .run();
  }
}

function plainText(doc: Doc): string {
  let out = "";
  const CHUNK = 8192;
  for (let i = 0; i < doc.cells.length - 1; i += CHUNK) {
    const end = Math.min(doc.cells.length - 1, i + CHUNK);
    out += String.fromCharCode(...doc.cells.slice(i, end).map((c) => c & 0xffff));
  }
  return out;
}

/** The sequencer's Store on the Durable Object's SQLite. */
class SqlStore implements Store {
  private readonly storage: DurableObjectStorage;

  constructor(storage: DurableObjectStorage) {
    this.storage = storage;
  }

  private get sql() {
    return this.storage.sql;
  }

  private meta(key: string): string | undefined {
    return this.sql.exec<{ value: string }>("SELECT value FROM meta WHERE key = ?", key).toArray()[0]?.value;
  }

  private setMeta(key: string, value: string | number): void {
    this.sql.exec("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", key, String(value));
  }

  head() {
    const version = this.meta("version");
    const length = this.meta("length");
    return version && length ? { version: Number(version), length: Number(length) } : null;
  }

  snapshot() {
    const version = this.meta("snap_version");
    if (!version) return null;
    const cells: number[] = [];
    for (const row of this.sql.exec<{ cells: ArrayBuffer }>("SELECT cells FROM snapshot_part ORDER BY part"))
      for (const c of new Uint32Array(row.cells)) cells.push(c);
    return { version: Number(version), doc: { cells, links: JSON.parse(this.meta("snap_links") ?? "[]") as string[] } };
  }

  opsAfter(v: number): Committed[] {
    return this.sql
      .exec<{ version: number; client: string; seq: number; op: string }>(
        "SELECT version, client, seq, op FROM op WHERE version > ? ORDER BY version",
        v,
      )
      .toArray()
      .map((r) => ({ v: r.version, c: r.client, s: r.seq, op: decodeOp(JSON.parse(r.op) as WireOp) }));
  }

  committedAt(client: string, seq: number): number | undefined {
    return this.sql.exec<{ version: number }>("SELECT version FROM op WHERE client = ? AND seq = ?", client, seq).toArray()[0]
      ?.version;
  }

  oldest(): number | undefined {
    return this.sql.exec<{ v: number | null }>("SELECT MIN(version) AS v FROM op").toArray()[0]?.v ?? undefined;
  }

  append(entry: Committed, author: string, length: number): void {
    this.storage.transactionSync(() => {
      this.sql.exec(
        "INSERT INTO op (version, client, seq, author, op) VALUES (?, ?, ?, ?, ?)",
        entry.v,
        entry.c,
        entry.s,
        author,
        JSON.stringify(encodeOp(entry.op)),
      );
      this.setMeta("version", entry.v);
      this.setMeta("length", length);
    });
  }

  writeSnapshot(version: number, doc: Doc): void {
    this.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM snapshot_part");
      for (let part = 0; part * PART_CELLS < doc.cells.length; part++) {
        const cells = Uint32Array.from(doc.cells.slice(part * PART_CELLS, (part + 1) * PART_CELLS));
        this.sql.exec("INSERT INTO snapshot_part (part, cells) VALUES (?, ?)", part, cells.buffer);
      }
      this.setMeta("snap_version", version);
      this.setMeta("snap_links", JSON.stringify(doc.links));
    });
  }

  dropThrough(v: number): void {
    this.sql.exec("DELETE FROM op WHERE version <= ?", v);
  }
}
