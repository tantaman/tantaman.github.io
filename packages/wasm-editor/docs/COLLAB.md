# Collaborative editing for canvas.wasm

Real-time collaborative editing and presence for the canvas editor, with the
current text persisted. The design is the central-authority model ProseMirror's
collab module uses, tightened to scale: one sequencer per document puts every
change in one order and rebases late ones itself, and clients rebase their own
unconfirmed changes. There is no CRDT and no per-character metadata; the
document in memory stays the engine's gap buffer of cells, and the saved
snapshot is those cells.

Status: built. The engine seams and the canvas drawing are in `src/wat/`, the
client, operations and sequencer in `src/collab/`, the Durable Object and its
Worker route in `rindle-site/server/collab-doc.ts` and
`rindle-site/server/collab-http.ts`. `canvas.html?doc=<id>` edits a document
together; `pnpm dev` serves the same sequencer in memory.

```
 browser tab                                     Cloudflare
 ┌──────────────────────────────┐   WebSocket    ┌──────────────┐   ┌──────────────────────────┐
 │ canvas.wasm  ⇄  collab client │ ─────────────▶ │ Worker       │──▶│ EditorDoc Durable Object │
 │ (engine +     (src/collab/)   │ ◀───────────── │ auth, route  │   │ one per document          │
 │  UI)                          │                └──────────────┘   │ SQLite: ops, snapshot     │
 └──────────────────────────────┘                                   │ memory: recent ops        │
                                                                     │ attachments: presence     │
                                                                     └────────────┬─────────────┘
                                                                                  │ alarm, debounced
                                                                                  ▼
                                                                     D1: document index (optional)
```

## Decisions

**A sequencer, not a CRDT.** Every edit the engine makes is already a
positional record (INSERT, DELETE, SET) with its inverse, in a flat sequence of
cells. Operational transformation over a flat sequence is small and exact, and
with one sequencer per document only the simplest property (TP1) is needed.
A CRDT would add identifiers and tombstones beside every character and a
mapping layer between them and the engine's positions, to buy offline editing
and peer-to-peer sync, which this editor does not need.

**Rebase on the server, not reject.** Stock ProseMirror collab rejects any
submission not based on the latest version; the client pulls, rebases and
retries. That is fine for a handful of writers and starves under hundreds: most
submissions arrive stale. Here the sequencer transforms an incoming operation
over everything committed since its base version, from a window of recent
operations it keeps in memory. A client based on a version older than the
window is told to reload.

**The Durable Object's own SQLite holds the document.** Operations and the
snapshot live in `ctx.storage.sql`, next to the sequencer: transactional, no
network hop per keystroke. Output gates hold the object's outgoing messages
until its writes are durable, so a client that sees its operation echoed back
knows it is saved. D1 is not on the editing path. It holds only an optional
document index (title, text, version, last update), written on a debounced
alarm.

**Presence is never stored.** Cursors live in each WebSocket's serialized
attachment, so they survive the object hibernating, and are broadcast in
batches.

## Operations (`src/collab/ot.ts`)

The document is the engine's cell sequence (see the top of
`src/wat/engine.wat`): a UTF-16 code unit in bits 0-15, marks in bits 16-20 of
text cells, block format in bits 16-20 of `\n` terminators, a link id in bits
21-31. Link ids are local to each copy of the document (the link table is
append-only and not undone), so operations never carry them: a component
carries the URLs, a cell's link bits index them, and each copy interns them.

An operation is a list of components that walks the whole document:

| component | JSON | meaning |
| --- | --- | --- |
| retain | `n` (a positive number) | keep the next `n` cells |
| insert | `{"i": cells, "l"?: urls}` | insert cells; a cell's bits 21-31 index `l` (1-based), 0 = no link |
| delete | `{"d": n}` | delete the next `n` cells |
| format | `{"f": n, "m": mask, "v": value, "l"?: url}` | on the next `n` cells, `cell = (cell & ~m) \| v` over bits 16-20; if `m` has the link bits, the cells link to `l` (`""` unlinks) |

Retains, deletes and formats add up to the length of the document the
operation applies to. The final terminator is never deleted and nothing is
inserted after it (`validate` refuses such operations). Formats never change a
cell's code unit; an engine SET that does is captured as a delete and an
insert. A format carries only the bits that changed, so a bold and a
concurrent italic on the same text both survive.

On the wire an insert's cells travel as `{"t": text, "a"?: runs}`: the code
units as a string plus runs of the cells' upper 16 bits, about one byte per
character of plain text.

- **apply(doc, op)** to a plain cell array (the sequencer's snapshot, tests).
- **compose(a, b)**: one operation with the effect of `a` then `b`.
- **transform(a, b, aFirst)**: `a'` such that applying `b` then `a'` has the
  effect of `a`, where `aFirst` says the sequencer ordered `a` first. Two
  inserts at the same position keep sequencer order. A delete that overlaps
  another delete shrinks. A format loses the cells another operation deleted,
  is split by cells another operation inserted, and, where two formats touch
  the same bits of the same cell, the later one in sequencer order wins.
- **transformPosition(pos, op, assoc)**: where a caret goes. An insert at the
  caret pushes it right when `assoc` is 1 and leaves it when -1; a deleted
  range collapses to its start.
- **invert(op, doc)**: the inverse, given the document before `op` (deletes and
  formats need the old cells).
- **split(op, max)**: two operations with the same effect, the first inserting
  at most `max` cells, so no message grows past a WebSocket's limit.

## The sequencer (`src/collab/server-core.ts`)

`Sequencer` orders one document's operations over a `Store`; `Room` speaks
the protocol to a set of connections and batches broadcasts. Both are plain
TypeScript: the Durable Object, the tests and the dev server run the same code
over different stores and sockets.

Receiving `op {seq, base, op}` from a client:

1. `(client, seq)` already committed: a duplicate. Ignore it.
2. `base` outside the in-memory window (the last 1,000 operations): send
   `reset`.
3. Validate the operation against the document length at `base`; refuse it with
   `reset` if it is malformed.
4. Transform it over every operation committed after `base`, each ordered
   first.
5. Store it at the next version with the new length (one transaction), and
   queue it for broadcast. The queue is flushed to every connection in one
   message every 20 ms, so fan-out is per tick, not per keystroke.

A client that says `hello` with version `v` gets the operations after `v` when
they are all still stored, else the snapshot and the operations after it.

Compaction folds the operations since the snapshot into a new snapshot once
2,000 have accumulated, and forgets operations older than the window.

### `EditorDoc` (`rindle-site/server/collab-doc.ts`)

One Durable Object per document, named by document id. Its SQLite:

```sql
CREATE TABLE op (version INTEGER PRIMARY KEY, client TEXT NOT NULL, seq INTEGER NOT NULL,
                 author TEXT NOT NULL, op TEXT NOT NULL, UNIQUE (client, seq));
CREATE TABLE snapshot_part (part INTEGER PRIMARY KEY, cells BLOB NOT NULL);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

`op` holds the wire form. The snapshot is split into 256K-cell parts because a
Durable Object value is limited to 2 MB (the engine's limit of 1M cells is 4
MiB); `meta` holds the head version and length, the snapshot's version and
link table, and the document id. Sockets use the hibernation API; a
connection's user, name, colour, client id and latest selection are its
attachment. After any commit an alarm is set for 10 seconds later: it compacts
when due, and writes the D1 index row when a `COLLAB_DB` binding exists
(`rindle-site/migrations-collab/`; the wrangler.jsonc comment says how to
create it).

`rindle-site/server/collab-http.ts` handles `/api/collab/<id>`. It refuses
other origins (the session cookie rides a WebSocket upgrade from any page) and
anonymous callers (401). A plain GET answers whether the caller may join,
because a browser can't read why an upgrade failed. A WebSocket upgrade is
forwarded to the document's object with the verified user.
`rindle-site/src/worker-entry.ts` routes `/api/collab/*` there and everything
else to TanStack Start. Durable Objects exist only in the Cloudflare build
(`pnpm preview:cf`, deploy), not under `pnpm dev`.

## Protocol (`src/collab/protocol.ts`)

JSON over one WebSocket per tab.

| direction | message | meaning |
| --- | --- | --- |
| client → | `{"t":"hello","client":id,"version":v}` | join, or rejoin at version `v` (-1: I have nothing) |
| ← server | `{"t":"snap","part":k,"parts":n,"version":s,"cells":…,"links"?}` | part of the snapshot at version `s`, when the client needs one |
| ← server | `{"t":"init","version":v,"snapshot":bool,"ops":[…],"you":…,"peers":[…]}` | caught up: the operations after the snapshot or the client's version |
| client → | `{"t":"op","seq":s,"base":v,"op":…}` | one operation, based on version `v` |
| ← server | `{"t":"ops","ops":[{"v","c","s","op"}]}` | committed operations in order; the client that sent one recognises its own `(c, s)` as the acknowledgement |
| client → | `{"t":"presence","v":v,"a":anchor,"f":focus}` | my selection, in version `v`'s coordinates |
| ← server | `{"t":"presence","peers":[…]}` | changed peers: `{id, name, color, v, a, f}`, or `{id, gone: true}` |
| ← server | `{"t":"reset","reason":…}` | reload from `hello` with version -1 |

## The client (`src/collab/client.ts`, `engine-doc.ts`)

`createCanvasEditor(el, { collab: { url, onStatus, onPeers, onLost } })` sets
it up (`src/canvas.ts`): a reconnecting WebSocket (`src/collab/socket.ts`), and
the module's exports wrapped so that `afterLocal()` runs after every call into
it.

### Capturing local edits

`set_collab(1)` puts the engine in collab mode. The engine keeps logging every
local edit to its undo log exactly as before, and the client drains the log
after every call (`undo_ptr`, `undo_bytes`) and clears it (`clear_history`).
One drain holds one or more transactions, each `BEGIN … END` around INSERT,
DELETE and SET records in sequential positions; each becomes one operation by
composing its records, and its inverse is built from the same payloads.
Because the log is cleared every time, the engine's history never grows,
never trims and never re-opens an old transaction, which are the three things
that would make it hard to read.

If one command's records do not fit in the log (a mark toggled over more than
about 500K cells), the engine drops them and sets `journal_lost`. The client
then sends a whole-document replacement read from the engine's cells, and
clears its undo history.

### Keeping in step

The classic three-state OT client: in sync; one operation awaiting
acknowledgement; or one awaiting and a buffer composed from everything done
since. A committed operation from someone else is transformed over the
awaiting operation and then the buffer (each ordered after it) and applied to
the engine with `apply_insert(pos, n, who)`, `apply_delete(pos, n)` and
`apply_format(pos, n, mask, value)`, which skip the log and move the local
selection. The awaiting and buffered operations are transformed the other way.
On acknowledgement the buffer is sent. A client therefore sends at most one
operation per round trip however fast it types: 2,100 keystrokes in a quick
burst went out as 34 operations in the Durable Object test.

After a reconnect the client says `hello` with its version; an operation sent
on the old socket and not among the ones it gets back was never committed, so
it is sent again (duplicates are dropped by `(client, seq)`). A client that
fell behind the window reloads from the snapshot; if it had unsent edits they
are lost and `onLost` says so.

### Undo

Collab mode routes undo and redo to the client: the engine's `undo`/`redo`
(keyboard, toolbar, edit menu) set `undo_request` instead of acting, and
`can_undo`/`can_redo` report what the client sets with `set_undo_state`. The
undo stack holds inverse operations in current coordinates; consecutive typing
composes into the top entry, one step per word as before. A remote operation
is transformed down the stack from the top, the way ot.js does it, so undo
only reverts your own edits and puts them where they now are. Undoing applies
the entry, pushes its inverse (computed with `read_cells`) on the redo stack,
and sends it like any edit.

### Presence

The client sends its selection when it changes, at most every 200 ms, and only
when it has nothing unacknowledged, so the selection is in the coordinates of
a committed version. A remote edit alone sends nothing: the last sent
selection is moved through it before comparing. Remote selections are mapped
forward from their version through the committed operations since (the client
keeps the last 512) and its own unacknowledged ones, then written to the
engine's remote cursor table (64 entries: anchor, focus, colour). From then on
the engine moves them itself on every edit, local or remote, and the author of
a remote insert moves along with their own text. The canvas draws each as a
tint of its colour under the text, under the local selection, and a caret with
a tab at its top, folded into the band damage keys like the touch overlays so
a moving cursor repaints only the lines it touches.

## Engine changes

| export | purpose |
| --- | --- |
| `set_collab(on)` | collab mode: undo/redo become requests; history cleared |
| `undo_ptr()` | address of the undo log, for draining |
| `journal_lost()` | 1 if log records were dropped since the last call; clears the flag |
| `undo_request()` | 0, 1 undo or 2 redo, requested since the last call; clears it |
| `set_undo_state(bits)` | 1 can undo, 2 can redo, for the toolbar |
| `apply_insert(p, n, who)`, `apply_delete(p, n)`, `apply_format(p, n, m, v)` | someone else's edit; `who` is the author's remote cursor or -1 |
| `load_cells(n)` | replace the document with `n` cells at OUT, keeping the link table |
| `read_cells(p, n)` | copy cells to OUT |
| `doc_version()` | changes whenever the cells change; the canvas lays out again when it does |
| (internal) DAMAGE | the ranges edits changed since the last layout, for incremental layout |
| `remote_ptr()`, `remote_count()`, `set_remote_count(n)` | the remote cursor table |
| `refresh()` (canvas) | paint after direct changes, without scrolling to the caret |

## Running it

- `pnpm --filter @tantaman/wasm-editor dev`, then `canvas.html?doc=anything` in
  two tabs: the Vite plugin in `vite.config.ts` serves `/api/collab/<id>` from
  an in-memory sequencer.
- rindle-site: `pnpm preview:cf` or a deploy, signed in, then
  `/wasm-editor/canvas.html?doc=<id>`.

## Limits

- One document is at most the engine's 1M cells and 131,072 visual lines. The
  sequencer refuses an edit that would grow a document past 1,000,000 cells,
  since a copy that could not hold it would fall out of step.
- Layout is incremental (`ui-layout.wat`): a batch of remote operations is
  laid out once, at the next paint, and only around the ranges it changed
  (the engine keeps up to 64 per frame; an edit past that joins the nearer
  range).
  Each range still moves every line after it: about 0.1 ms a range in a
  document of 50,000 lines, so a batch touching 64 far apart places costs
  about 6 ms there. An edit that reflows a whole paragraph lays out that
  paragraph. Remote edits above the view scroll it with the text, keeping
  the first line in view (or the text after an edit that reaches into the
  view) where it was on screen; at the top of the document, text flows down.
- One Durable Object is single-threaded; Cloudflare documents a soft limit of
  about 1,000 requests a second per object. Each client sends at most one
  operation per round trip and presence at most five times a second, and the
  object broadcasts once per tick, which keeps a few hundred active writers
  under the limit on paper. That has not been measured.
- An edit that inserts more than 100,000 cells is sent as several operations,
  one per round trip.
- A link that cannot be interned (an unsafe URL, or the 2,047-entry link table
  is full) arrives unlinked on that copy only.
- Any signed-in user who knows a document id can edit it. Per-document access
  is not built.
- Until the first `init`, the editor shows an empty document; edits made then
  are sent once connected, unless the server's snapshot replaces them.

## Testing

- `test/ot.test.ts`: randomised checks that `transform` satisfies TP1 in either
  order, that `compose`, `invert` and `split` agree with `apply`, that
  `transformPosition` follows the cells, and that the wire form round-trips.
- `test/collab.test.ts`: three engine instances with collab clients connected
  to the sequencer through a network that delays, interleaves and drops
  messages and disconnects clients. Random typing, deletion, marks, blocks,
  links, pastes, checkboxes, undo and redo on every copy; after the network
  drains, every copy's cells must equal the sequencer's document. Variants run
  with a tiny window and frequent compaction, so clients reload.
  `COLLAB_SEEDS=2000` runs a longer hunt.
- `test/engine.test.ts`, `test/canvas.test.ts` and `test/display-list.test.ts`
  cover the new exports and the drawing of remote selections.
- `test/layout.test.ts`: random batches of remote and local edits, close
  together and far apart, with the lines after each frame compared to laying
  out the whole document (`LAYOUT_SEEDS=1000` for a longer run); and that a
  remote edit above the view leaves the text in it where it was.
- The Durable Object was checked by hand under `wrangler dev` with clients over
  real WebSockets: convergence, compaction on the alarm, and a new client
  loading the document after a restart.
