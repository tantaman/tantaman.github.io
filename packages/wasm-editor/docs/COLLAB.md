# Collaborative editing for canvas.wasm

Real-time collaborative editing and presence for the canvas editor, with the
current text persisted. The design is the central-authority model ProseMirror's
collab module uses, tightened to scale: one sequencer per document puts every
change in one order, and clients rebase their own unconfirmed changes. There
is no CRDT and no per-character metadata; the document in memory stays the
engine's gap buffer of cells, and the saved snapshot is those cells.

```
 browser tab                                     Cloudflare
 ┌──────────────────────────────┐   WebSocket    ┌──────────────┐   ┌──────────────────────────┐
 │ canvas.wasm  ⇄  collab client │ ─────────────▶ │ Worker       │──▶│ EditorDoc Durable Object │
 │ (engine +     (src/collab/)   │ ◀───────────── │ auth, route  │   │ one per document          │
 │  UI)                          │                └──────────────┘   │ SQLite: ops, snapshot     │
 └──────────────────────────────┘                                   │ memory: recent ops,       │
                                                                     │         presence          │
                                                                     └────────────┬─────────────┘
                                                                                  │ alarm, debounced
                                                                                  ▼
                                                                          D1: document index
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
knows it is saved. D1 is not on the editing path. It holds only the document
index (title, owner, last update, a Markdown copy for search), written on a
debounced alarm.

**Presence is never stored.** Cursors live in each WebSocket's serialized
attachment, so they survive the object hibernating, and are broadcast in
batches.

## Operations

The document is the engine's cell sequence (see the top of
`src/wat/engine.wat`): a UTF-16 code unit in bits 0-15, marks in bits 16-20 of
text cells, block format in bits 16-20 of `\n` terminators, a link id in bits
21-31. Link ids are local to each copy of the document (the link table is
append-only and not undone), so operations never carry them: they carry the
URL, and each copy interns it.

An operation is a list of components that walks the whole document:

| component | JSON | meaning |
| --- | --- | --- |
| retain | `n` (a positive number) | keep the next `n` cells |
| insert | `{"i": cells, "l"?: urls}` | insert cells; a cell's bits 21-31 index `l` (1-based), 0 = no link |
| delete | `{"d": n}` | delete the next `n` cells |
| format | `{"f": n, "m": mask, "v": value, "l"?: url}` | on the next `n` cells, `cell = (cell & ~m) \| v` over bits 16-20; if `m` has the link bits, the cells link to `l` (`""` unlinks) |

The sum of retains, deletes and formats is the length of the document the
operation applies to. Formats never change a cell's code unit; an engine SET
that does is captured as a delete and an insert.

The four functions (`src/collab/ot.ts`):

- **apply(doc, op)** to a plain cell array (tests, the server snapshot).
- **compose(a, b)**: one operation with the effect of `a` then `b`.
- **transform(a, b, aFirst)**: `a'` such that applying `b` then `a'` has the
  effect of `a`, where `aFirst` says which of the two the sequencer ordered
  first. Two inserts at the same position keep sequencer order. A delete that
  overlaps another delete shrinks. A format loses the cells another operation
  deleted, is split by cells another operation inserted, and, where two formats
  touch the same bits of the same cell, the later one in sequencer order wins.
- **transformPosition(pos, op, assoc)**: where a caret goes. An insert at the
  caret pushes it right when `assoc` is 1 and leaves it when -1; a deleted
  range collapses to its start.

Inverses are computed against the document before the operation (deletes and
formats need the old cells), which the client always has.

## The sequencer: `EditorDoc`

One Durable Object per document, named by document id
(`rindle-site/server/collab-doc.ts`; the logic is in
`src/collab/server-core.ts` so it runs in tests without Cloudflare).

```sql
CREATE TABLE op (version INTEGER PRIMARY KEY, client TEXT NOT NULL, seq INTEGER NOT NULL,
                 author TEXT NOT NULL, op TEXT NOT NULL, UNIQUE (client, seq));
CREATE TABLE snapshot (part INTEGER PRIMARY KEY, version INTEGER NOT NULL, cells BLOB NOT NULL,
                       links TEXT NOT NULL);
```

The snapshot is split into parts because a Durable Object value is limited to
2 MB; the engine's limit of 1M cells is 4 MiB.

Receiving `op {client, seq, base, op}`:

1. `(client, seq)` already committed: a resend after a reconnect. Echo the
   committed version to that client and stop.
2. `base` older than the in-memory window: send `reset`.
3. Transform `op` over every operation committed after `base`, each ordered
   first.
4. Check that the result applies to the current document length; if not, the
   client is out of step: send `reset`.
5. Insert the row at the next version, update the length, queue the operation
   for broadcast. The queue is flushed to every socket in one message per
   tick, so fan-out is per tick, not per keystroke.

On wake, the object reads the current version and length and loads the window
(the last 1,000 operations) from SQLite.

Compaction runs on an alarm once 2,000 operations have accumulated since the
snapshot: it composes them, applies the result to the snapshot, writes the new
snapshot and deletes operations older than the window. The same alarm writes
the D1 index row when a D1 binding is present.

## Protocol

JSON over one WebSocket per tab, at `/api/collab/<docId>` (the Worker checks
the Better Auth session first; anonymous callers get 401).

| direction | message | meaning |
| --- | --- | --- |
| client → | `{"t":"hello","client":id,"version":v}` | join, or rejoin at version `v` (-1: I have nothing) |
| ← server | `{"t":"init","version":v,"snapshot"?,"ops":[…],"you":peer,"peers":[…]}` | catch up: a snapshot only when `v` is older than the window |
| client → | `{"t":"op","seq":s,"base":v,"op":…}` | one operation, based on version `v` |
| ← server | `{"t":"ops","ops":[{"v","c","s","op"}]}` | committed operations in order; the client that sent one recognises its own `(c, s)` as the acknowledgement |
| client → | `{"t":"presence","v":v,"a":anchor,"f":focus}` | my selection, in version `v`'s coordinates |
| ← server | `{"t":"presence","peers":[…]}` | changed peers: `{id, name, color, v, a, f}`, or `{id, gone: true}` |
| ← server | `{"t":"reset"}` | reload from `hello` with version -1 |

## The client (`src/collab/`)

### Capturing local edits

`set_collab(1)` puts the engine in collab mode. The engine keeps logging
every local edit to its undo log exactly as before, but the host drains the log
after every call into the module (`undo_ptr`, `undo_bytes`) and clears it
(`clear_history`). One drain holds one or more transactions, each `BEGIN …
END` around INSERT, DELETE and SET records in sequential positions; each
becomes one operation by composing its records, and its inverse is built from
the same records' payloads. Because the log is cleared every time, the
engine's own history never grows, never trims and never re-opens an old
transaction, which are the three things that would make it hard to read.

If one command's records do not fit in the log (a mark toggled over more than
about 500K cells), the engine drops them and sets a flag
(`journal_lost`). The client then sends a whole-document replacement computed
from the engine's cells, and clears its own undo history.

### Remote edits

`apply_insert(pos, n)` (cells at OUT), `apply_delete(pos, n)` and
`apply_format(pos, n, mask, value)` change the document without logging and
map the local selection and the remote cursor table through the change. They
end typing coalescing, so the next keystroke starts a new transaction.
`load_cells(n)` replaces the whole document. The canvas build's `refresh()`
lays out and repaints after a batch of them.

### Keeping in step

The client is the classic three-state OT client: in sync; one operation
awaiting acknowledgement; or one awaiting and a buffer composed from
everything typed since. An incoming committed operation is transformed over
the awaiting operation and then the buffer (each ordered after it), and the
transformed result is applied to the engine. The awaiting and buffered
operations are transformed the other way. On acknowledgement the buffer is
sent.

### Undo

Collab mode routes undo and redo to the host: the engine's `undo`/`redo`
(keyboard, toolbar, edit menu) record a request instead of acting, and the
host answers it. The host's undo stack holds inverse operations in current
coordinates. A new local operation pushes its inverse (consecutive typing
composes into the top entry, one step per word as before). A remote operation
is transformed down the stack from the top, the way ot.js does it, so undo
only reverts your own edits and puts them where they now are. `set_undo_state`
tells the toolbar whether undo and redo are possible.

### Presence

The client sends its selection at most five times a second, with the version
it refers to. Remote selections are mapped forward from that version by the
client, then written to the engine's remote cursor table (64 entries of
anchor, focus and colour). From then on the engine moves them itself on every
edit, local or remote, so they stay attached to their text between updates.
The canvas draws each as a coloured caret and a translucent selection, and
folds them into its band damage keys like the touch overlays.

## Engine changes

| export | purpose |
| --- | --- |
| `set_collab(on)` | undo/redo become requests; `can_undo`/`can_redo` come from the host |
| `undo_ptr()` | address of the undo log, for draining |
| `journal_lost()` | 1 if the last command's records were dropped; clears the flag |
| `undo_request()` | 0, 1 undo or 2 redo, requested since the last call; clears it |
| `set_undo_state(bits)` | 1 can undo, 2 can redo |
| `apply_insert(p, n)`, `apply_delete(p, n)`, `apply_format(p, n, m, v)` | remote edits |
| `load_cells(n)` | replace the document with `n` cells at OUT |
| `remote_ptr()`, `set_remote_count(n)` | the remote cursor table |
| `refresh()` (canvas) | lay out and repaint after remote edits |

## Limits

- One document is at most the engine's 1M cells and 131,072 visual lines.
- Layout is still whole-document on every change (`$relayout`). With many
  writers the client applies each batch of remote operations with one
  `refresh()`, so it lays out once per batch, but a document near the cell
  limit with constant remote edits will be slow until layout is incremental.
- One Durable Object is single-threaded; Cloudflare documents a soft limit of
  about 1,000 requests a second per object. Clients send at most one `op`
  every 100 ms while another writer is active and presence at most five times
  a second; the object broadcasts once per tick. That keeps a few hundred
  typists under the limit on paper; it has not been measured.
- A link that cannot be interned (unsafe URL, or the 2,047-entry link table is
  full) arrives unlinked on that copy only.
- Any signed-in user who knows a document id can edit it. Per-document access
  is not built yet.

## Testing

- `test/ot.test.ts`: randomised checks that `transform` satisfies TP1 and
  that `compose` and inversion agree with `apply`.
- `test/collab.test.ts`: several engine instances, each with a collab client,
  connected to an in-process sequencer through a network that delays and
  reorders delivery per link. Random typing, deletion, formatting, links,
  pastes, undo and redo on every copy; after the network drains every copy's
  cells must equal the sequencer's document.
- `test/engine.test.ts` covers the new exports.
