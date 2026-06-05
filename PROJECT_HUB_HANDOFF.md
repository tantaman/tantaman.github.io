# Project Hub — Handoff Doc

Resume point for the Projects→"project hub" redesign in the thoughts app. **M1a and
M1b are done and verified (working tree, not committed).** This doc front-loads
every decision, convention, and concrete spec so the remaining milestones (M1c,
M1d) can be executed quickly by pattern-matching the existing code — no
re-discovery needed.

> Read order for a fresh session: §1 (vision) → §2 (status) → §3 (conventions —
> the important part) → the spec for the milestone you're doing (§6/§7) →
> §8 (verify). Memory file: `~/.claude/.../memory/project-hub-redesign.md`.

---

## 1. Vision & locked decisions

**Mental model:** *Project = the fast capture/organize layer (keyboard-first,
list/cards, no dragging). Framing = the slow, deliberate spatial canvas.* A
project accretes things cheaply; "spin out to a framing" (dropped for now, was
M1e) is the escape hatch for spatial reasoning. Don't reintroduce canvas-style
drag-to-organize into projects.

**Decisions locked with the user (do not relitigate):**
- **Layout = 3-pane workbench**: left project-switcher rail · center sections ·
  right Conversation/Activity rail.
- **Conversation = dedicated `project_comment` table**, decoupled from thoughts
  (NOT the thought reply-tree). Render markdown via the app's `renderMarkdown`.
- **Project routes are `bare`** (immersive, like `/framings/$id`, `/graph`, doc
  editor). The global Sidebar is intentionally gone on `/projects*`; the rail's
  "‹ Thoughts" link is the way back. The user explicitly chose to keep this.
- **M1e (spin-out-to-framing) is dropped.**
- Activity log should be a **lightweight auto-recorded stream**, not a
  diff/version system.

**Architectural keystone:** mirror the existing generic `framing_node(node_type,
item_id)` pattern with a generic `project_item` table for all *linked* items
(M1d). Tasks stay native (own table + `task_dependency` DAG). This is what makes
"attach anything" one code path.

---

## 2. Status & milestone plan

| Step | Scope | Migrations | Status |
|---|---|---|---|
| **M1a** | workbench shell + command bar (task verbs) + tasks overhaul (optimistic, drag-reorder, inline edit, searchable blocker combobox, editable title/desc, progress ring) | none | ✅ done |
| **M1b** | `project_comment` + right-rail **Talk** pane (markdown, threaded, optimistic); `GET /projects/:id` grew to include `comments` | `0054` | ✅ done |
| **M1c** | `project_activity` + **Activity** tab (auto-recorded server-side events) | `0055` | ✅ done — spec in §6 |
| **M1d** | generic `project_item` + Documents/References/Attachments sections + command-bar `@`/URL/file/`/new` verbs | `0056`, `0057` | ✅ done — spec in §7 |

Each milestone = one migration, additive, independently shippable. After each,
run the adversarial review workflow (§8).

---

## 3. Conventions to follow (copy these patterns)

### File map (all under repo root)
```
worker/
  src/index.ts        # Hono routes. Project endpoints ~L1646+; comments after the blocker routes.
  src/schemas.ts      # zod request bodies. Add new ones near CreateProjectCommentBody.
  migrations/00NN_*.sql# Next number is 0055. Auto-applied in tests via readD1Migrations.
  test/projects.test.ts# Integration tests. Helpers: req(), json(path,body,method), AUTH, JSON_HEADERS.
packages/thoughts/src/
  components/projects/  # ProjectWorkbench, ProjectSwitcherRail, ProjectView, ProjectConversation, BlockerCombobox
  routes/projects.tsx, projects_.$id.tsx   # both staticData:{bare:true}
  api.ts               # fetch wrappers. Bearer auth via Authorization header.
  hooks/useCache.ts    # SWR hooks. useProject(id) -> {data,mutate}, key `project-${id}`.
  types.ts             # ProjectDetail = {project, tasks, deps, comments} (+ add activity/items)
  markdown.ts          # renderMarkdown(text) -> sanitised HTML w/ #tags + [[wiki]] links
  styles/thoughts.css  # single flat file; project styles ~L4239+; tokens are CSS vars
```

### Worker endpoint conventions
- Auth: `if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);` for writes. Reads are public.
- After any write: `await bumpVersion(c.env.DB);` (drives ETag/304 caching).
- Validate bodies with a zod schema from `schemas.ts` (`Body.parse(await c.req.json())`).
- **Project-scope every query** with `WHERE ... project_id = ?` (and bind the route `:id`), even after an id-guarded UPDATE, for defense-in-depth.
- Parse ids: `const id = parseInt(c.req.param("id"), 10); if (!Number.isFinite(id)) return c.json({error:"Bad id"},400);`
- Tasks are NOT project-scoped in their route (`/tasks/:id`); to do project-scoped work (e.g. activity logging) look up `project_id` from the task row first (see the blockers handler, which already fetches `blocked.project_id`).

### Migration conventions
- **Do NOT add `PRAGMA foreign_keys`.** No migration does. D1 enforces FKs by
  default; `ON DELETE CASCADE` works in prod (the app already relies on it for
  thought deletes — see `src/index.ts` "removed by ON DELETE CASCADE"). The test
  harness sets the pragma itself (`test/apply-migrations.ts`). A pragma in a
  migration is per-connection and would be ineffective anyway. (This was a
  reviewer false-alarm in M1b — don't repeat it.)
- Use `ON DELETE CASCADE` for child rows of a project; `REFERENCES project(id)`.
- New migrations are auto-picked-up by tests. **Deploy needs `wrangler d1
  migrations apply` against remote D1** — call this out to the user each time.

### Frontend optimistic-update pattern (the core idiom)
`useProject(id)` returns `{ data, mutate }`. Both `ProjectView` and
`ProjectConversation` use the SAME key (`project-${id}`) so they share one cache
entry and one fetch. Optimistic write = set cache now, fire API, revalidate (which
also rolls back on error):

```ts
const apply = (next: ProjectDetail, fn: () => Promise<unknown>) => {
  if (!secret) return;
  setErr('');
  mutate(next, { revalidate: false });           // optimistic
  fn().then(
    () => mutate(),                                // success → revalidate to truth
    (e: { message?: string }) => { setErr(e?.message || 'Something went wrong'); mutate(); }, // error → rollback
  );
};
```
- Builders spread `...data!` so they only touch their own slice (`{...data!, tasks}`
  / `{...data!, comments}`) — keeps the other panes' optimistic state intact.
- **Optimistic temp ids are negative** (`-Date.now()`). Gate all id-dependent
  interactions on `id > 0` (a `pending` flag) so an in-flight row can't be
  edited/dragged/deleted before its real id lands (this was a real M1a bug fix).
- `mutate()` revalidate after success replaces temp rows with server truth.

### Routing
- Bare immersive route: `createFileRoute('/x')({ staticData: { bare: true }, component })`.
  `__root.tsx`'s `RouteShell` renders only `<Outlet/>` when `bare`.

### Styling
- Single `thoughts.css`, BEM-ish `project-*` classes. Use CSS vars only (no
  hardcoded colors): `--bg --bg-soft --text --text-muted --accent --border
  --border-heavy --shadow-color`. Dark mode is automatic via these.
- Workbench is `display:flex; min-height:100vh`. Rails are fixed-width, sticky,
  `height:100vh`, `overflow-y:auto`. There's a `@media (max-width:768px)` block
  that stacks the panes — add any new pane's mobile rules there.

### Tests
- `worker/test/projects.test.ts`. Use `json(path, body, method?)` and `req(path, init?)`.
  Cover: happy path, project-scoping/cross-project isolation, cascade, and auth (401).

---

## 4. Data model (current + planned)

```sql
project(id, thought_id?, title, description?, status['draft'|'active'|'archived'], created_at, archived_at?)
task(id, thought_id?, title, description?, created_at, completed_at?, deprioritized_at?, project_id?, position?)
task_dependency(blocker_task_id, blocked_task_id)             -- DAG, cycle-checked
project_comment(id, project_id, parent_id?, body, created_at, updated_at?)   -- M1b (0054)
-- planned:
project_activity(id, project_id, kind, detail?, created_at)   -- M1c (0055)
project_item(id, project_id, item_type, item_id, role?, position?, added_at)  -- M1d (0056)
```
`ProjectDetail` (types.ts) = `{ project, tasks, deps, comments }` →
add `activity` (M1c) and `items` (M1d). The hub fetch is `GET /projects/:id`.

---

## 5. API (current)
- `GET /projects?status=active|draft|archived|all` → list w/ task_count, completed_count
- `POST /projects` {title, description?} → active project
- `GET /projects/:id` → **the hub**: `{project, tasks, deps, comments}`
- `PATCH /projects/:id` {title?, description?, status?, archived?}
- `POST /projects/:id/convert` (draft→active)
- `POST /projects/:id/tasks` {title, description?}
- `POST /projects/:id/tasks/reorder` {ids:[]}  (sets `position`)
- `PATCH /tasks/:id` {completed?, deprioritized?, title?, description?}
- `DELETE /tasks/:id`
- `POST /tasks/:id/blockers` {blocker_task_id} · `DELETE /tasks/:id/blockers/:blockerId`
- `POST /projects/:id/comments` {body, parent_id?} · `PATCH`/`DELETE /projects/:id/comments/:commentId`

Client wrappers for all of these exist in `packages/thoughts/src/api.ts`.

---

## 6. M1c spec — Activity log

> **Shipped (M1c).** Migration `0055`, `logActivity()` helper next to `bumpVersion`,
> emit points exactly per the table below, `activity` added to the hub (newest-first,
> `LIMIT 50`). Decisions taken: skipped reorder, comment, deprioritize, and
> rename logging (noise). Dependency add/remove detail = `"<blocker> → <blocked>"`.
> Task routes look up `project_id` from the task row and skip logging when null.
> Frontend: `ProjectActivity` type + `activity` on `ProjectDetail`; the Activity tab
> renders `data.activity` via a `describeActivity(kind)→{icon,label}` map (unknown
> kinds degrade gracefully); no optimistic writes — refreshes on the next `mutate()`.
> Tests in `projects.test.ts` `describe("projects: activity log")`. **Deploy still
> needs `wrangler d1 migrations apply` on remote D1.**


**Goal:** an auto-recorded, glanceable, reverse-chron event stream in the
right-rail **Activity** tab (already stubbed in `ProjectConversation.tsx`:
`tab === 'activity'` currently shows "Activity log lands in the next step.").

**Decision (recommended default):** server-side **auto-record** on existing
mutations. No manual-note composer in v1 (the Talk pane already covers free-form
notes). *If the user wants manual notes later, add `POST /projects/:id/activity`
{detail} + a small composer — but confirm first.*

### Backend
1. **Migration `0055_create-project-activity.sql`:**
   ```sql
   CREATE TABLE project_activity (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
     kind TEXT NOT NULL,
     detail TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX idx_project_activity_project ON project_activity(project_id);
   ```
2. **Helper** in `index.ts` near `bumpVersion`:
   ```ts
   async function logActivity(db: D1Database, projectId: number, kind: string, detail: string | null) {
     await db.prepare(
       "INSERT INTO project_activity (project_id, kind, detail, created_at) VALUES (?, ?, ?, ?)"
     ).bind(projectId, kind, detail, Math.floor(Date.now()/1000)).run();
   }
   ```
3. **Emit at these mutation points** (call after the write, before/with bumpVersion).
   For task routes that lack a project in the path, look up `project_id` from the
   task row first and skip if null:
   | Endpoint | kind | detail |
   |---|---|---|
   | POST /projects | `project_created` | title |
   | POST /projects/:id/convert | `project_activated` | — |
   | PATCH /projects/:id (archived toggle) | `project_archived` / `project_unarchived` | — |
   | POST /projects/:id/tasks | `task_added` | task title |
   | PATCH /tasks/:id completed=true/false | `task_completed` / `task_reopened` | title |
   | DELETE /tasks/:id | `task_deleted` | title (read before delete) |
   | POST/DELETE /tasks/:id/blockers | `dependency_added` / `dependency_removed` | optional |
   - Skip reorder (too noisy). Comments: optional `comment_added` — leaning skip
     (Talk already shows them); confirm preference. Title/description edits:
     optional `project_renamed` — leaning skip to avoid noise.
4. **Hub:** add to `GET /projects/:id` response:
   ```ts
   const activityRes = await c.env.DB.prepare(
     "SELECT id, project_id, kind, detail, created_at FROM project_activity WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 50"
   ).bind(id).all();
   // return { project, tasks, deps, comments, activity: activityRes.results }
   ```

### Frontend
- `types.ts`: `ProjectActivity { id, project_id, kind, detail, created_at }`;
  add `activity: ProjectActivity[]` to `ProjectDetail`.
- `ProjectConversation.tsx`: replace the Activity stub with a list reading
  `data?.activity`. Map `kind`→icon+label (e.g. `task_completed`→"✓ completed",
  `task_added`→"＋ task", `project_activated`→"→ active"). Use the existing
  `timeAgo()` helper. No optimistic writes needed — it refreshes when the hub
  revalidates after each mutation (every mutation already calls `mutate()`).
- CSS: small `.project-activity-*` rules (reuse muted/tabular conventions).

### Tests
- After create/complete/delete, assert `GET /projects/:id` `activity` contains the
  expected kinds, newest-first. Assert deleting the project cascades activity.

**Effort note:** the no-optimism Activity tab is cheap because every task/comment
mutation already revalidates the hub, so activity appears on the next tick.

---

## 7. M1d spec — Linking layer (Documents / References / Attachments)

> **Shipped (M1d).** Migrations `0056` (`project_item`) + `0057` (`project_attachment`).
> Endpoints: `POST/PATCH/DELETE /projects/:id/items` (UNIQUE → 409) and multipart
> `POST /projects/:id/attachments` + `DELETE …/:attachmentId` (R2 key
> `projects/{id}/{ts}-{name}`, served via existing `/api/attachments/*`). The hub
> grew `items` (server-resolved per type via `resolveProjectItems` — reuses
> `loadPostsManifest`, now exported from `typeahead.ts`) and `attachments`.
> Activity logs `item_attached/_detached` + `attachment_added/_removed`.
> **Bookmarks are linked by URL** (item_id = the URL; resolution enriches from the
> `bookmark` table when present, else falls back to the bare URL) — NOT by table id.
> Frontend: `ProjectView` gained **Documents** (item_type document) + **References**
> (everything else) + **Attachments** sections; the command bar is multi-verb —
> `@` opens `ItemLinkPicker` (reuses `/typeahead` d/t/p/f/b), a bare URL links a
> bookmark, `/new doc [title]` creates+links a document (stays in place, no nav),
> and files drop/paste/click-upload anywhere on the project. Item links use SPA
> `<Link>` for document/thought/framing and plain `<a>` for post/paste/bookmark; a
> deleted/private target resolves to `null` → "(unavailable …)". Tests:
> `projects.test.ts` `describe("projects: linked items" | "projects: attachments")`.
> **Deploy: apply `0056` + `0057` to remote D1.** (M1e remains dropped.)


**Goal:** attach existing docs/thoughts/bookmarks/framings (and files) to a
project; render them as sections in `ProjectView`; add command-bar verbs.

**Keystone:** copy the `framing_node` generalization. The framing GET handler in
`worker/src/index.ts` already resolves heterogeneous `(node_type, item_id)` rows
into display payloads (title/body/etc.) — **reuse that resolution logic** for the
hub's `items`.

### Backend
1. **Migration `0056_create-project-item.sql`:**
   ```sql
   CREATE TABLE project_item (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
     item_type TEXT NOT NULL,   -- 'document'|'thought'|'bookmark'|'framing'|'project'
     item_id TEXT NOT NULL,     -- string id/slug, like framing_node.item_id
     role TEXT,                 -- optional: 'spec'|'reference'|'design'|...
     position INTEGER,
     added_at INTEGER NOT NULL,
     UNIQUE(project_id, item_type, item_id)
   );
   CREATE INDEX idx_project_item_project ON project_item(project_id);
   ```
2. **Endpoints** (mirror framing node endpoints):
   - `POST /projects/:id/items` {item_type, item_id, role?} → 409 on UNIQUE clash
   - `DELETE /projects/:id/items/:itemId`
   - `PATCH /projects/:id/items/:itemId` {role?, position?} (optional)
3. **Hub:** add `items` to `GET /projects/:id`, resolving each item's display
   fields per `item_type` (title/snippet/slug/status) — copy framing GET's
   per-type SELECTs. Return `{...item, resolved:{title, snippet, href, ...}}`.

### Attachments (decide approach)
Two options — recommend **(A)** for consistency:
- **(A) `project_attachment` table** parallel to `thought_attachment`
  (project_id, attachment_key, attachment_type, attachment_name). Add a multipart
  `POST /projects/:id/attachments` — **copy the thought attachment upload handler**
  (R2 `BUCKET.put`, key like `projects/{id}/{safeName}`). Serve via existing
  `/api/attachments/*`. Cascade-delete keys on project delete (note: R2 GC is
  manual, same caveat as thoughts).
- (B) Treat attachments as `project_item` rows pointing at thought attachments.
  More indirection; skip.

### Frontend
- `ProjectView.tsx`: add collapsible **Documents / References / Attachments**
  sections below Tasks, reading `data.items` grouped by `item_type`. Optimistic
  add/remove via the same `apply` pattern (temp negative id for new items).
- **Command-bar verbs** (extend `submitCmd` in `ProjectView.tsx`):
  - `@…` → typeahead picker to link an existing item. **Reuse the doc editor's
    mention/`@` picker** (`DocumentEditView.tsx` has a suggestion extension that
    searches documents/thoughts/pastes/framings/posts) or call the same search
    endpoints (`/documents`, `/thoughts/search`, `/framings`, posts manifest).
    On pick → `POST /projects/:id/items`.
  - paste a URL → attach as `item_type:'bookmark'`, `item_id:url` (OG fetch
    optional/later; v1 can store the URL + use it as title).
  - drop/paste a file → upload (attachments approach A) → render in Attachments.
  - `/new doc` → `createDocument(...)` then attach the new doc id; optionally
    navigate to the doc editor.
- `api.ts`: `addProjectItem`, `removeProjectItem`, (`patchProjectItem`),
  `uploadProjectAttachment`.
- Reuse media-grid styling for attachments; doc-card styling for documents.

### Tests
- Attach/detach round-trip, UNIQUE clash → 409, cross-project isolation, cascade
  on project delete, item resolution shape in the hub.

**Suggested sub-steps (each shippable):** M1d.1 schema+items endpoints+hub
resolution → M1d.2 Documents/References sections + `@` verb → M1d.3 attachments
(table+upload+section+drop/paste) → M1d.4 URL→bookmark + `/new doc`.

---

## 8. Verify (run after every milestone)

```bash
# from repo root
pnpm -C packages/thoughts exec tsc --noEmit -p tsconfig.json      # thoughts types
pnpm -C worker        exec tsc --noEmit -p tsconfig.json          # worker types
pnpm -C worker        exec vitest run test/projects.test.ts       # projects tests
pnpm -C packages/thoughts build                                   # vite build (docs/thoughts is gitignored, CI-built)
```
Then run the **adversarial review workflow** (ultracode): two reviewers over the
working-tree diff (frontend correctness + worker/data), each finding verified by
an independent skeptic before you act. Scripts from M1a/M1b are at
`~/.claude/.../workflows/scripts/review-m1{a,b}-diff-*.js` — copy and adjust the
scope/lenses. Triage: fix real bugs, verify "platform" claims against the repo
before changing anything (see the FK false-alarm in §3).

---

## 9. Gotchas / non-obvious
- **Deploy:** new migrations need `wrangler d1 migrations apply` on remote D1
  before the feature works in prod. Tell the user each milestone.
- **`docs/thoughts/` is gitignored** and built in CI; local `pnpm build` produces
  it but don't commit it.
- **Nothing committed yet** for M1a/M1b — it's all in the working tree on
  `master`. Branch before committing if/when the user asks.
- **Shared SWR cache:** ProjectView + ProjectConversation both mutate
  `project-${id}`. Disjoint-field spreads + revalidate keep them consistent;
  transient cross-clobber self-heals on the next `mutate()`.
- **renderMarkdown** is the app-wide trust model (same as ThoughtCard); not a new
  XSS surface — don't add a one-off sanitizer.
- **dedupingInterval 5000** in SWR config — explicit `mutate()` still revalidates.
- Don't reintroduce the global Sidebar on `/projects*` (bare is intentional).
- M1e (spin-out-to-framing) is dropped; don't build it without a new ask.
