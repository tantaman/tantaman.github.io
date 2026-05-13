# Thoughts App — TanStack Router Migration Plan

Migrating `packages/thoughts` from hand-rolled hash routing to TanStack Router, section by section.

## Survey of what we're migrating

**22 routes**, three URL formats glued together:
- Hash (most routes): `#tasks`, `#thought-123`, `#framing-7`, etc.
- Pathname legacy redirect: `/thoughts/t/:id` → `#thought-:id` (App.tsx:36–39)
- Query string (PWA share target): `?share_url=...&share_text=...&share_title=...&as=thought`

**~30 call sites** to convert:
- 28 components with `href="#..."` links
- 5 components doing `window.location.hash = ...` or `history.pushState(...)`
- `Layout.tsx` switches between "with chrome" and "bare" layouts based on `route.view` membership
- `documents/*` routes render `DocumentsSidebar` + view together (a nested layout in disguise)

**Bundle cost** if we add lazy routes: Leaflet, ReactFlow, UMAP, tiptap currently load up-front (only tldraw is lazy).

## Target URL shape (under `/thoughts/` basepath)

```
/                  feed (?prefill=...)
/t/$id             thread
/tasks /questions /events /locations /media
/movies /books /music /bookmarks
/browse /graph
/amplifications
/capture           (?url= &text= &title=)
/framings
/framings/$id
/canvases
/canvases/$id
/documents
/documents/new
/documents/$id
```

## Phase 0 — Setup (one PR, no behavior change)

1. Add `@tanstack/react-router`, `@tanstack/react-router-devtools`, `@tanstack/router-plugin`.
2. Configure the vite plugin with `routesDirectory: 'src/routes'`, `generatedRouteTree: 'src/routeTree.gen.ts'`.
3. Use **file-based routing** — 22 routes is too many for code-based to stay readable, and the generated tree gives us full type inference.
4. Create empty `src/routes/` and ship.

## Phase 1 — Scaffold all routes as thin shells (one PR, behavior-preserving)

Goal: TanStack owns the URL; every current page still renders. No internal logic changes yet.

- `routes/__root.tsx`: wraps `SWRProvider` + `AuthContext` + chrome/bare layout chooser + `<Outlet />` + `SecretToggle`. Chrome vs bare decided by `useMatches()` + `staticData.bare === true`.
- One route file per existing view, each just renders the current view component unchanged. Mark `framings/$id`, `canvases/$id`, `documents/*`, `graph` with `staticData: { bare: true }`.
- `routes/_documents.tsx`: pathless layout route under `/documents/*` that renders `DocumentsSidebar` + `<Outlet />`. This replaces the `<><DocumentsSidebar /><DocumentEditView /></>` ternaries in App.tsx.
- **Legacy hash redirect** in `__root.tsx` `beforeLoad`: if `location.hash.match(/^#(thought|framing|canvas|document)-(\d+)$/)` or matches a static hash like `#tasks`, `router.navigate()` to the pathname equivalent and clear the hash. This keeps every external link, bookmark, and the existing pre-push-hook-built `docs/thoughts/` content working through the cutover.
- Replace `App.tsx` body with `<RouterProvider router={router} />`. Keep `App.tsx` as the file that constructs the router with `basepath: '/thoughts/'`.
- **Acceptance**: visit every old URL form (hash, `/thoughts/t/:id`, share-target query), confirm the right page renders.

## Phase 2 — Convert call sites, section by section

Each bullet is one PR. Order is low-risk-first so any router bugs surface on small surfaces before the big sweep.

1. **Sidebar nav** (Sidebar.tsx): all `<a href="#xxx">` → `<Link to="/xxx">`. Drop the manual `route.view === '...'` active className; use `activeProps={{ className: 'active' }}`. This kills the `route` prop on `Sidebar` and `Layout`.
2. **Browse / Capture / Amplifications** (BrowseView, AmplificationsView, CaptureView): small, self-contained `<Link>` conversions.
3. **Framings & Canvases & Documents links** (FramingsListView, CanvasesListView, DocumentsListView, DocumentsSidebar, TldrawCanvasView, FramingLeftPanel, framing/FramingNode, framing/DocumentNode): `<Link to="/framings/$id" params={{ id }}>` etc.
4. **Thread links** — biggest sweep, ~14 components: RelatedPanel, AncestorChain, QuestionsView, ThoughtCard, TasksView, ThreadView, Feed, MusicView, BooksView, MoviesView, FramingDetailPane, ThoughtDuplicatesPopover, MediaView. All `href={`#thought-${id}`}` → `<Link to="/t/$id" params={{ id }}>`. Do it as one mechanical PR.
5. **Programmatic navigation** (ThoughtGraph:333, FramingsListView:37, framing/DocumentNode:76, framing/FramingNode:24, ThreadView:23, Sidebar:45): `window.location.hash = ...` → `useNavigate()` + `navigate({ to: '...' })`.

After step 5, every internal navigation goes through TanStack. The legacy hash redirect from Phase 1 still catches inbound external links.

## Phase 3 — Exploit features (one PR each, opportunistic)

1. **Typed search params on `/capture`**: `validateSearch` schema for `url`, `text`, `title`. Replace App.tsx:43–62. The `as=thought` redirect-to-feed-with-prefill case becomes a `beforeLoad` redirect to `/?prefill=...`.
2. **Typed search params on `/`**: `validateSearch` for `prefill`. Drop the `{view:'feed', prefill}` discriminated union.
3. **Typed `id` params**: `parseParams: { id: Number }` on thread/framing/canvas/document. View components receive `id: number` directly.
4. **Lazy routes** for heavy pages — convert to `createLazyFileRoute`: `/canvases/$id` (tldraw), `/locations` (Leaflet), `/framings/$id` (ReactFlow), `/graph` (UMAP), `/media`. Measure the bundle-split impact and keep what helps.
5. **Loaders (optional)**: pull SWR fetches into route `loader`s for `/t/$id`, `/framings/$id`, `/documents/$id`. Only worth doing if you want render-blocking data + clean pending states; SWR's current behavior may already be fine.

## Phase 4 — Cleanup

- Delete `Route` union in `types.ts`.
- Delete `parseHash()` in App.tsx and the legacy hash effect (leave the hash redirect in `__root.tsx` for inbound links).
- Drop `route` prop on Layout, Sidebar — they read from the router.
- Drop the chrome/bare branching in `Layout.tsx` (now lives in the route tree).

## Risks / things to remember

- **Pre-push hook** rebuilds `packages/thoughts` and fails if `docs/thoughts/` is dirty. Each PR has to include the rebuilt `docs/thoughts/`.
- **PWA share target**: confirm `docs/thoughts/manifest.webmanifest` (if present) still points at a URL the router accepts. `validateSearch` on `/capture` should make this transparent.
- **Service worker**: if `docs/thoughts/` has a SW, check its cached URL list — new pathnames need to be fetched, not served stale.
- **The legacy hash redirect** in `__root.tsx` should stay forever (or at least a year) — external bookmarks of `#thought-N` from your blog / others' references shouldn't break.
