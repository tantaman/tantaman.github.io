# rindle-site without the mid-tier: a pressure test

Thesis being tested: in the age of LLMs, mid-tier infrastructure (sync engines, general-purpose
databases, UI frameworks) goes away. Apps get bespoke databases, exact queries and exact event
streams instead.

The exercise: redo this site with no React, no TanStack, no Rindle, no Better Auth, no ReactFlow and
no Tiptap. SQLite is still allowed. The site has to stay just as live: every view updates on every
write, writes are optimistic, and a rejected write snaps back.

---

## 1. My read on the thesis

**The direction is right, but the line is in the wrong place.** Three refinements:

**1. What goes away is the layers whose value is code volume. The layers whose value is accumulated
validation stay.** A framework is worth two things: code you didn't write, and bugs someone else
already found. LLMs push the first toward zero and don't touch the second. SQLite has hundreds of
times more test code than library code. ProseMirror carries a decade of contenteditable bug
reports. Browsers, TLS and WebCrypto are the same. A bespoke rewrite of any of those is
*unvalidated*, not cheap. React's reconciler, TanStack's router, an ORM's query builder and most of
a sync engine's glue are mostly code volume. Those are the layers that go.

**2. Bespoke doesn't win by rewriting the general thing. It wins by not needing it.** A general
sync engine has to *discover* the write→read dependency graph at runtime, because it can't know
your app. That is what IVM is. A general optimistic engine has to *replay arbitrary mutators* on top
of state that has moved on (rebase), because it can't assume anything about who writes. This app
has one writer and about 40 fixed views, so it can just *write the graph down*. Before LLMs,
writing it down and keeping it in sync was the expensive, error-prone part, and paying for
generality was the rational trade. The thesis is really a bet that writing the graph down is now
cheap.

**3. Generality doesn't disappear. It moves from the runtime into the test suite.** Rindle's
contract, *view-after-write == fresh-query*, is a great **property test** even after it stops
being your runtime. The bespoke system in §3 is only safe because of §3.7: a fuzzer that checks
exactly that contract. Frameworks turn into oracles.

Corollaries:

- **The stack collapses toward two things:** platform standards (SQL, HTTP, DOM, WebSocket, View
  Transitions, speculation rules), and deep, validated engines (SQLite, the browser). The mid-tier
  between them turns into owned code.
- **Niche frameworks lose first, not ubiquitous ones.** An LLM writes React fluently because React
  is all over its training data. Rindle 0.10 costs context: see `AGENTS.md` pointing agents at
  `llms.txt` and listing seven "break one of these and the app goes subtly wrong" rules. Every one
  of those rules is a tax that comes from generality, not from this app:
  - `Date.now()` is banned in mutators because they get replayed.
  - Queries have to be named and registered.
  - Every table needs a single primary key.
  - Migrations are additive only.
  - `EMPTY_ID = "\u0000explore"` exists so that an empty `inList` still matches nothing.
  - Reply trees are flat windows because the query AST can't recurse.
  - `createThought` ships client-computed tasks, events and locations as args so replay stays
    deterministic.

  SQL and the DOM are the most-trained-on interfaces there are, so they're the cheapest thing to
  write *to*.
- **This site is the best case for the thesis, so don't generalize from it.** It has one writer,
  small data and fixed views. In a Linear/Notion-shaped app, users create their own views (so the
  write→read graph is dynamic) and many writers conflict (so rebase is real). There the general
  engine earns its keep, or the "bespoke" engine you write turns out to be an IVM engine.

---

## 2. What the app actually needs

This inventory drives every design decision below. It comes from reading the current code.

| Fact | Consequence |
|---|---|
| ~36 tables, ~40 named queries, 27 mutators, ~17k hand-written lines | A fixed, enumerable set of views and writes, so the dependency graph can be written down |
| Every authoring write goes through `requirePublisher`. Only comments come from other accounts | **One writer.** Conflicts are effectively impossible, so no rebase engine is needed |
| Reads are public. Privacy is `private=1` / `shared=0` versus the owner | **Two audiences, `public` and `owner`**, instead of per-query principals |
| Thousands of rows, not millions | Everything fits in one SQLite file on one box. Counts can be computed, not maintained |
| Enrichments (geocode, TMDB, OpenLibrary, iTunes, embedding color) land after commit | Async results have to arrive live, and they must survive a crash (today `waitUntil` can drop them) |
| Framing drags commit on drag-stop, not per frame | The write rate stays human-scale even on the canvas |
| Explore graph is browser-local (`local: true` tables, IndexedDB) | Client-only state, with no sync needed |

---

## 3. The design

### 3.1 Shape

```
Browser (any page)                    Worker (edge)                    Durable Object "site"  — one, single-threaded
──────────────────                    ─────────────                    ─────────────────────────────────────────────
SSR'd HTML  <main data-seq=N>  ◄─GET─ anon: edge cache ──miss──►       SQLite: content tables, card VIEWs, FTS5,
live.js  (~300 LOC, no deps)          owner: pass through               event log, job outbox, sessions
  WS /live?since=N ────────────────────────────────────────────────►   pages.ts   one fn per route: SQL → templates
  POST /m/:name {mid,args} ────────────────────────────────────────►   mutations.ts  validate → tx → touch → events
  predict → pending DOM overlay                                        live: hibernatable sockets tagged by audience
R2 ◄── PUT /files/* (attachments)                                      alarm(): drain job outbox (network enrichers)
```

The core idea is that **one process owns the database, the write path and the sockets.** That gives
you a total order (`seq`) for free and makes fan-out a loop, with no pub/sub, replication or
follower. A Durable Object with SQLite storage is exactly that process, and the site already runs
on Workers, R2 and D1. One VPS process running `better-sqlite3` + `ws` + Litestream would have the
same shape.

The current topology is a Worker, a Rindle write-master, a Rindle read-follower, a fleet edge, auth
D1, DHA D1 and R2. The bespoke version is a Worker, **one DO** and R2.

### 3.2 Data: tables, card views, the log

Keep the content tables (they're good), with these changes:

- **Drop the engine-imposed shapes.** Junction tables (`thoughtTag`, `postAuthor`, …) get composite
  primary keys instead of synthetic ids. The JSON-string `tags`/`concern` columns that are
  dual-written next to `postFacet` go away. The `ALTER` pile collapses into one clean schema file.
- **Store rendered HTML at write time** (`thought.bodyHtml`; `post.html` already works this way).
  Markdown gets rendered once per edit, not once per reader. Events carry HTML, so the client only
  needs `marked` for composer preview and optimistic prediction.
- **Card shapes are SQL `VIEW`s.** One definition serves both the page query and the event query:

```sql
CREATE VIEW thought_card AS
SELECT t.id, t.parentId, t.createdAt, t.updatedAt, t.version, t.private, t.color, t.bodyHtml,
  (SELECT count(*) FROM thought r WHERE r.parentId = t.id)                    AS replyCount,
  (SELECT count(*) FROM thought r WHERE r.parentId = t.id AND r.private = 0)  AS publicReplyCount,
  (SELECT json_group_array(name) FROM
     (SELECT tag.name FROM thoughtTag tt JOIN tag ON tag.id = tt.tagId
      WHERE tt.thoughtId = t.id ORDER BY tt.position))                         AS tags,
  (SELECT json_group_array(json_object('key', storageKey, 'type', mediaType, 'name', fileName)) FROM
     (SELECT * FROM thoughtAttachment a WHERE a.thoughtId = t.id ORDER BY a.position)) AS attachments
FROM thought t;
-- likewise: post_card, paste_card, comment_card, task_card, framing_node_card, …  (~16 total)
```

Counts are *computed* (they're index-backed and the data is small), not maintained. That's one
less invariant to keep true.

- **The event log and the job outbox are ordinary tables, written in the same transaction as the
  data:**

```sql
CREATE TABLE event (
  seq      INTEGER PRIMARY KEY,   -- global and monotonic: the only clock a client needs
  key      TEXT NOT NULL,         -- 'thought:01J…', 'comment:01J…', 'tag:ai', 'framingNode:…'
  audience TEXT NOT NULL,         -- 'public' | 'owner'
  row      TEXT,                  -- JSON card row (state, not an op); NULL = gone from this audience
  mid      TEXT                   -- the mutation that caused it, for optimistic acks
);
CREATE TABLE job (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, ref TEXT NOT NULL,
                  rev TEXT NOT NULL, runAt REAL NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
CREATE VIRTUAL TABLE search USING fts5(key UNINDEXED, title, body);   -- replaces the multi-LIKE search
```

### 3.3 Writes: handlers, `touch`, events in the same transaction

Mutation args shrink to what the user intended. The server derives everything else from the body:
tags, tasks, events, locations. Today the client computes those and ships them only because the
mutator must replay deterministically. Server-side `now()` is fine again.

```ts
// mutations/thoughts.ts
export function createThought(db: Db, a: CreateThought, who: Who, t: Touch) {
  requireOwner(who);
  t.touch("thought", a.id);
  if (a.parentId) t.touch("thought", a.parentId);                     // its reply count changes
  const ts = now();
  db.run(`INSERT INTO thought (id, authorId, body, bodyHtml, createdAt, updatedAt, parentId, private)
          VALUES (?,?,?,?,?,?,?,?)`, a.id, who.id, a.body, md(a.body), ts, ts, a.parentId, a.private);
  extractTags(a.body).forEach((name, i) => {
    db.run(`INSERT INTO tag (id, name) VALUES (?,?) ON CONFLICT DO NOTHING`, norm(name), name);
    db.run(`INSERT INTO thoughtTag (thoughtId, tagId, position) VALUES (?,?,?)`, a.id, norm(name), i);
    t.touch("tag", norm(name));
  });
  for (const cap of extractCaptures(a.body)) { insertCapture(db, a.id, cap); t.touch(cap.type, cap.id); }
  db.run(`INSERT INTO search (key, title, body) VALUES (?, '', ?)`, `thought:${a.id}`, a.body);
  for (const j of enrichmentJobs(a.id, a.body)) db.run(`INSERT INTO job (kind, ref, rev, runAt) VALUES (?,?,?,?)`, j.kind, j.ref, j.rev, ts);
}
```

`touch` is the handwritten dependency graph. Handlers call it *before* they write, so it can record
whether the key was public beforehand. `flush` turns touched keys into state events:

```ts
flush(mid: string): Event[] {
  const out: Event[] = [];
  for (const [key, wasPublic] of this.keys) {
    const row = card(this.db, key);                                   // SELECT * FROM <type>_card WHERE id = ?
    out.push(this.log(key, "owner", row, mid));
    if (row && isPublic(key, row)) out.push(this.log(key, "public", publicize(key, row), mid));
    else if (wasPublic)            out.push(this.log(key, "public", null, mid));   // it just left the public view
  }
  return out;
}
```

In the DO, the whole thing is one synchronous transaction followed by a loop:

```ts
mutate(name: string, mid: string, raw: unknown, who: Who): Event[] {
  const events = this.ctx.storage.transactionSync(() => {
    const t = new Touch(this.db);
    mutations[name](this.db, parse[name](raw), who, t);               // throw → rollback, nothing logged
    return t.flush(mid);
  });
  for (const ws of this.ctx.getWebSockets()) {
    const { audience } = ws.deserializeAttachment();
    const mine = events.filter((e) => e.audience === audience);
    if (mine.length) ws.send(JSON.stringify(mine));
  }
  if (this.hasDueJobs()) this.ctx.storage.setAlarm(Date.now());
  return events;
}
```

### 3.4 The stream

Four rules make a handwritten stream robust:

1. **Events carry state, not operations.** A reply bumps the parent's count by re-sending the
   parent's whole card row, never by sending `replyCount += 1`. Applying an event is then
   idempotent, and events can arrive out of order per key: last `seq` wins.
2. **Every connection gets its audience's whole stream.** There is no subscription registry. One
   writer produces maybe a few hundred events on a busy day. Clients ignore keys that aren't on
   screen. (If framings ever get live per-frame drags, those, and only those, get a room.)
3. **Catch-up is a query.** A page is rendered at `seq = N` and connects with
   `/live?since=N`. The DO replays `SELECT … WHERE seq > N AND audience = ?`, keeping only the
   latest row per key, since state events compact to "last per key". If `N` is older than
   retention (say 7 days), the client reloads.
4. **So stale HTML is safe to cache.** Anonymous pages can sit in the edge cache for minutes. The
   live socket fixes them within one round trip. With one DO in one region, this is what makes the
   site hold up under a front-page spike.

### 3.5 Client: the HTML is the app, and the DOM is the store

- **Pages are server-rendered HTML** from template functions shared by the DO and the browser
  (`html` tagged templates with escaping, about 20 lines). There's no hydration, so the whole class
  of hydration-mismatch bugs goes away, along with `ssr.ts`, `lib/hydration.ts` and the
  preload/dehydrate/hydrate dance.
- **Keyed leaves hold their own version:** `<article data-key="thought:01J…" data-seq="1234">`.
  Keyed elements never contain live children. A reply list is a *sibling* of the card face, so
  replacing a face can't wipe out a subtree.
- **Lists declare what they accept.** The same membership predicate exists in SQL (the page query)
  and in JS (live inserts). That duplication is the main honest cost of this design, and the
  oracle (§3.7) is what keeps it in sync.

```js
// live.js — the heart of the whole "framework"
export function apply(ev) {
  const type = ev.key.slice(0, ev.key.indexOf(":"));
  for (const el of document.querySelectorAll(`[data-key="${ev.key}"]`)) {
    if (Number(el.dataset.seq) >= ev.seq) continue;                        // stale or duplicate
    if (ev.row) el.outerHTML = faces[type](ev.row, ev.seq);
    else el.closest("[data-item]").remove();
  }
  if (!ev.row) return;
  for (const spec of lists) for (const box of document.querySelectorAll(spec.sel)) {
    const item = box.querySelector(`:scope > [data-item="${ev.key}"]`);
    const wants = spec.accepts(ev.row, box.dataset);                       // e.g. row.parentId === box.dataset.parent
    if (item && !wants) item.remove();
    else if (!item && wants) insertSorted(box, spec.item(ev.row, ev.seq), spec.sort(ev.row));
  }
}

export async function mutate(name, args, predicted = []) {
  const mid = ulid();
  const undo = predicted.map((ev) => stage(ev, mid));     // rendered with data-seq="0" data-pending=mid
  const res = await fetch(`/m/${name}`, { method: "POST", headers: { "content-type": "application/json" },
                                           body: JSON.stringify({ mid, args }) });
  const out = await res.json();
  if (!res.ok) { undo.forEach((u) => u()); return toast(out.error); }   // the snap-back
  out.events.forEach(apply);                              // authoritative; the socket's copies become no-ops
}
```

Optimistic writes don't need a rebase engine. A pending element has `data-seq="0"`, so *any*
authoritative event for that key replaces it. On rejection, `undo` removes the inserted element,
or puts back the saved `outerHTML`, but only if the element is still marked `data-pending=mid`.
**Predict only what the user is looking at:** the card, and maybe the parent's count. The tag
sidebar, the tasks view and everything else catch up one round trip later from real events.

- **Owner controls ship in every card.** They're hidden by CSS unless `<html class="owner">`.
  Enforcement is server-side, so the markup can be the same for both audiences. Behavior uses one
  delegated listener dispatching on `data-act`.
- **Navigation is a multi-page app again.** Speculation rules prerender on hover and
  `@view-transition { navigation: auto; }` animates between pages. Each page opens its socket with
  its own `since`; wait for `prerenderingchange` if prerendered. The browser now does what
  TanStack Router was doing. Composer drafts go to `localStorage`.
- **Islands** are page modules with their own imperative code, written against the same `apply`
  stream:
  - **Framing canvas:** absolutely positioned node `div`s in a `transform: translate() scale()`
    layer, an SVG edge layer, pointer events for pan, drag and connect, and wheel/pinch zoom
    anchored at the cursor. Positions commit on `pointerup`, as they do today. Incoming
    `framingNode` events move nodes, skipping any node currently being dragged.
  - **Explore:** the same canvas module in local mode, persisted as one JSON blob per session in
    IndexedDB (at most 200 nodes).
  - **Search palette:** `GET /search?q=` → FTS5 `bm25` ranking with audience filtering →
    rendered with the same faces. Request/response, not live.
  - **Composer:** textarea + `marked` preview.
  - **Post editor:** a markdown textarea with live preview replaces Tiptap (see §4).
  - **Paste comments:** the anchored comments reuse `lib/text-anchor.ts` as is, since it's already
    framework-free.

### 3.6 Jobs, auth, attachments

- **Enrichment uses a durable outbox.** The job row commits with the thought. `alarm()` drains due
  jobs: it makes the network call, then applies the result through the normal `mutate` pipeline
  (`apply:geocode`, `apply:tmdb`, …), so results reach every open page as ordinary events. The
  `rev` column carries forward today's `sourceRevision` guard: a slow job can't overwrite a newer
  edit. Failures back off and retry instead of disappearing into `waitUntil`.
- **Auth** is one OAuth provider (GitHub) with authorization code + PKCE via WebCrypto, a
  `session` table and an `HttpOnly; Secure; SameSite=Lax` cookie. The owner is the account whose
  verified email matches `OWNER_EMAIL`. `POST /m/*` requires a JSON content type and a matching
  `Origin`. That's about 250 lines. It's the one bespoke piece I'd have a second reviewer audit,
  because security bugs don't show up in the UX.
- **Attachments:** the Worker streams `PUT /files/:key` into R2, and the mutation references
  `storageKey`. A job sweeps orphans.

### 3.7 Correctness: Rindle's contract, demoted to a test

```ts
// test/oracle.test.ts — runs the production code paths in-process (SQLite in memory, live.js on linkedom)
for (let run = 0; run < 500; run++) {
  const db = seeded(run);
  const pages = PAGES.flatMap((url) => AUDIENCES.map((aud) => ({ url, aud, dom: parse(render(db, url, aud)) })));
  for (const m of randomMutations(db, 50, run)) {
    const events = tryMutate(db, m);                              // same handler/touch/flush as prod
    for (const p of pages) events.filter((e) => e.audience === p.aud).forEach((e) => applyTo(p.dom, e));
  }
  for (const p of pages) assertSameView(p.dom, parse(render(db, p.url, p.aud)));   // view-after-write == fresh-query
}
```

This test catches a missing `touch`, a JS `accepts` that drifted from its SQL `WHERE`, a privacy
leak (public DOM containing an owner-only key), and a bad `publicize`. In the bespoke world, this
test is what the framework used to be.

`assertSameView` has to encode the one place the contract is deliberately looser. When a live
window loses a row, it stays one short until "load more"; it doesn't pull the next row in. So the
oracle compares the prefix, not the length.

---

## 4. Pressure-test results

**What got simpler**

- **Privacy:** two audiences in `flush` replace principal-parameterized query ASTs.
- **Reply trees:** `WITH RECURSIVE` over the displayed roots replaces a global flat reply window
  that gets reassembled on the client.
- **Search:** FTS5 with ranking replaces N `ilike` subscriptions merged in the browser.
- **Enrichment:** now durable (outbox) instead of best-effort (`waitUntil`).
- **Mutators:** no determinism rules, no client-computed enrichment args, and no 100-line
  `superRefine` blocks validating ids the client invented only for replay.
- **SSR:** it's just the page, with no hydration.
- **Topology:** Worker + one DO + R2, replacing Worker + master + follower + fleet edge + auth D1.
- **Debuggability:** every layer is a few hundred lines you can read, and the event log is a
  queryable history of every change the site has ever pushed.

**What got harder**

- **A new view touches four places** instead of one `defineQuery`: a SQL view or query, a page
  function, a list spec, and `touch` rules. This is the crux of the thesis. I think it's fine
  *because* an LLM does the four edits and the oracle catches the miss. Without the oracle, I
  wouldn't do this.
- **The canvas.** Roughly 1.5k lines replace ReactFlow. The first 80% is a day's work. The last
  20% (trackpad pinch versus wheel, touch, edge hit-testing, keyboard and a11y, zoom-to-fit) is
  exactly the validated long tail from §1.1. Expect to find bugs by using it.
- **Offline/local-first queries over synced data are gone.** This site barely used them, apart from
  Explore, which is now a local JSON blob.
- **One region.** Reads rely on edge caching plus catch-up rather than read replicas. That's fine
  at this scale, and it's the first thing that would break at a very different scale.

**What I refused to write bespoke**

| Thing | Why | Instead |
|---|---|---|
| SQLite | Accumulated validation (§1.1) | Kept, per the rules |
| Rich-text editor (Tiptap/ProseMirror) | Same: contenteditable is the SQLite of the UI | **Changed the product:** a markdown textarea with preview. For a markdown-native author this is arguably better, but it *is* a product change forced by the constraint |
| Crypto | Same | WebCrypto (platform) |
| Markdown, syntax highlighting, JSX transform for pastes | Leaf libraries, not frameworks: you call them, they don't own your control flow or data model | Kept `marked`, a highlighter, `sucrase` |

That last row matters for how you phrase the thesis. **"No frameworks" in practice means "no
*foreign* frameworks."** `live.js`, `Touch` and the list specs are a small framework. It's just
sized to this app, and you own it. The thesis isn't "no abstractions". It's "abstractions stop
being shared across apps."

**Size.** Very roughly, I'd expect this to land around the current ~17k lines, maybe somewhat under.
Templates replace TSX minus the hook and provider plumbing, and SQL replaces the query builder. On
the other side, a canvas, auth and the DO server get added. **The win isn't line count.** It's that
the dependency graph goes from React + TanStack Start/Router + Rindle (wasm engine, optimistic
client, API server, CLI, replicator, follower) + ReactFlow + Tiptap + Better Auth + zod to three
leaf libraries, and that no line in the system is one you can't read.

**Verdict for this site:** the thesis holds, with the §1 amendments. I'd trust the result more than
the current stack in some ways (durable jobs, recursive queries, legibility) and less in one: the
canvas, until it's been used for a while.

---

## 5. Next iteration: no SQLite

At this scale (~10⁴ rows, well under 100 MB), it's feasible, and it exposes the purest form of the
thesis: **the event log *is* the database.** You'd append state events to durable storage, rebuild
in-memory `Map`s plus the exact sorted indexes each view needs on boot, and write a small inverted
index for search. Every "query" is then a function over those indexes.

What you'd actually lose from SQLite here:

1. Atomic commit of data + log + outbox. That becomes a single append, which is actually simpler.
2. Recursive CTEs and JSON aggregation. These become a few loops, which is fine.
3. FTS5 ranking. You'd write BM25, which is about 100 lines and fine.
4. **Ad hoc SQL for debugging, migrations and one-off analysis.** This is the real loss. You'd end
   up writing a tiny query language to poke at production, which means reinventing the thing you
   removed.

One wrinkle: on a SQLite-backed Durable Object, the KV storage API is itself stored in SQLite. So
"no SQLite" on Cloudflare is cosmetic unless you also leave the platform. That's a nice
demonstration of §1.1: the validated engine is still there, just further down the stack.
