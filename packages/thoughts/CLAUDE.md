# packages/thoughts

A short-form thought capture app — a microblog / second brain. Thoughts are auto-organized into tasks, events, locations, movies, and books via structured tags. Built as a Vite React SPA served at `/thoughts/`.

## Tech Stack

React 19, Vite, TanStack Router (file-based, code-split per route), SWR (data fetching), Leaflet (maps), @xyflow/react (graph canvases), marked (markdown rendering). TypeScript throughout.

## Structured Tags

Thoughts are plain text with markdown support. Special tags at the start of a line extract structured data into separate database tables on the backend:

| Tag | Purpose | Syntax | Enrichment |
|-----|---------|--------|------------|
| `#t` | Task | `#t Fix the bug` | Completable/deprioritizable in tasks view |
| `#e` | Event | `#e 03/15/2025 3pm Team sync` | Date parsing, calendar view |
| `#l` | Location | `#l San Francisco` | Mapbox geocoding → lat/lng, Leaflet map |
| `#m` | Movie | `#m The Matrix` | Media gallery |
| `#b` | Book | `#b Gödel Escher Bach` | Media gallery |
| `#a` | Album | `#a Kid A` | iTunes lookup → cover/artist/year |
| `#p` | Project | `#p Launch website` | Bootstraps a **draft** project; `#t` replies in its subtree accrete as tasks |

Lines following a tag are captured as its description until the next tag or end of body.

## Projects

Projects are first-class structured records, a sibling to framings (a different
view over the same thought substrate, not a graph canvas). A thought only
*bootstraps* a project — once it exists, its tasks are edited directly and no
thoughts are created.

- **Capture** — `#p` creates a *draft* project; `#t` replies under it accrete as
  tasks, and reply nesting seeds task dependencies. Drafts live in their own
  section of `/projects` until converted.
- **Convert** — "Convert to project" promotes a draft to active (adopting its
  captured tasks in place) and seals it: new `#t` thoughts no longer flow in.
- **Edit** — active-project edits (add/rename/delete task, add/remove
  dependency) operate on task records directly; projects can also be created
  from scratch in the UI with no thought. Dependencies are task-to-task (a real
  DAG, stored in `task_dependency`); the view groups tasks into Ready / Blocked
  / Completed.

## Search

Embedding-based semantic search via the backend (`/api/thoughts/search`). Results include a similarity score. Tag filtering is separate — AND logic across selected tags via the sidebar.

## Framings

Framings are interactive graph canvases (ReactFlow) for spatially organizing thoughts and blog posts. Nodes are draggable, edges are labeled and directed. Double-click canvas to compose inline. Used for intentional curation vs. the chronological feed.

## Views / Routes

File-based routing under `src/routes/` via TanStack Router. All paths are relative to the `/thoughts/` basepath.

| Path | View | Layout | Description |
|------|------|--------|-------------|
| `/` | Feed | chrome | Chronological thought stream with search and compose. `?prefill=...` pre-fills compose. |
| `/t/$id` | Thread | chrome | Parent thought + replies. `id` typed as `number` via `parseParams`. |
| `/projects` | Projects list | chrome | Active projects + a Drafts section (Convert to project) |
| `/projects/$id` | Project | chrome | Tasks grouped Ready/Blocked/Completed; thought-free editing |
| `/tasks` | Tasks | chrome | Filterable task list with complete/deprioritize toggles |
| `/questions` | Questions | chrome | Filterable question list with answered toggle |
| `/events` | Events | chrome | Calendar with event highlights |
| `/locations` | Locations | chrome | Leaflet map + location list (lazy chunk) |
| `/media` | Media | chrome | Lightbox gallery of attachments |
| `/movies` | Movies | chrome | Movie list |
| `/books` | Books | chrome | Book list |
| `/music` | Music | chrome | Album gallery |
| `/bookmarks` | Bookmarks | chrome | OG-preview cards |
| `/amplifications` | Amplifications | chrome | Captured external links |
| `/capture` | Capture | chrome | New amplification form. `?url=`/`?text=`/`?title=` pre-fill (PWA share target). |
| `/graph` | Graph | bare | UMAP thought graph |
| `/framings` | Framings list | chrome | List of graph canvases |
| `/framings/$id` | Framing | bare | Single ReactFlow canvas (lazy chunk) |
| `/documents` | Documents list | bare | Document index |
| `/documents/new` | New doc | bare + sidebar | Create a document |
| `/documents/$id` | Edit doc | bare + sidebar | Edit an existing document |

Routes carry `staticData.bare: true` to skip the chrome layout (sidebar + tag pills), and `staticData.withSidebar: true` to render the docs-specific sidebar. The chrome/bare switch lives in `routes/__root.tsx` `RouteShell`.

Inbound legacy URLs (`/thoughts/#thought-N`, `/thoughts/#tasks`, etc.) are redirected to pathnames in `__root.tsx` `beforeLoad`. Wiki-link anchors rendered via `dangerouslySetInnerHTML` in markdown (`<a class="wiki-link" href="/thoughts/...">`) are intercepted by a document-level click delegate that routes through TanStack instead of doing a full reload.

Routes are auto-code-split by the router plugin (`autoCodeSplitting: true` in `vite.config.ts`).

## Build

- `pnpm dev` — Vite dev server (proxies non-`/thoughts/` requests to `tantaman.com`)
- `pnpm build` — Production build to `../../docs/thoughts/` (served at `/thoughts/`)
- Pre-push hook rebuilds this app and fails if `docs/thoughts/` has uncommitted changes

## Backend

Cloudflare Worker in `../../worker/`. API at `https://tantaman.com/api`. Auth via `Authorization: Bearer {secret}` header (secret stored in localStorage). Read endpoints are public; writes require auth.

## Source Structure

```
src/
├── App.tsx              # createRouter + RouterProvider (router setup only)
├── main.tsx             # React entrypoint
├── routeTree.gen.ts     # Auto-generated by @tanstack/router-plugin
├── routes/              # File-based routes (one file per path)
│   ├── __root.tsx       # Root: providers, layout switch, legacy hash redirect, wiki-link delegate
│   ├── index.tsx        # /
│   ├── t.$id.tsx        # /t/$id
│   ├── _documents.tsx                       # pathless layout (docs sidebar conditional)
│   ├── _documents.documents.tsx             # /documents
│   ├── _documents.documents_.new.tsx        # /documents/new
│   ├── _documents.documents_.$id.tsx        # /documents/$id
│   ├── framings.tsx, framings_.$id.tsx      # /framings, /framings/$id
│   └── (tasks, questions, events, locations, media, movies, books, music, bookmarks, amplifications, capture, graph).tsx
├── auth-context.ts      # AuthContext (consumed via useContext)
├── tags-context.ts      # TagsContext: selectedTags + selectedFraming, hoisted into __root.tsx state
├── api.ts               # All API calls (fetch wrappers)
├── types.ts             # TypeScript interfaces
├── auth.ts              # localStorage secret management
├── markdown.ts          # marked config + hashtag highlighting + wiki-link rendering
├── swr-config.tsx       # SWR provider
├── components/
│   ├── Feed.tsx         # Main feed with search + compose
│   ├── ComposeForm.tsx  # Rich compose (file upload, preview, reply)
│   ├── ThoughtCard.tsx  # Single thought rendering
│   ├── ThreadView.tsx   # Thread parent + replies
│   ├── TasksView.tsx    # Task list
│   ├── EventsView.tsx   # Calendar
│   ├── LocationsView.tsx # Leaflet map
│   ├── MediaView.tsx    # Attachment gallery
│   ├── Sidebar.tsx      # Left nav (uses TanStack <Link> + activeProps)
│   ├── TagsSidebar.tsx  # Tag filter + framing selector
│   ├── SearchBar.tsx    # Debounced search input
│   └── framing/         # ReactFlow canvas components
│       ├── FramingCanvasView.tsx
│       ├── useFramingCanvas.ts
│       ├── ThoughtNode.tsx
│       ├── PostNode.tsx
│       ├── ComposeNode.tsx
│       └── LabeledEdge.tsx
├── hooks/
│   ├── useThoughts.ts   # Paginated thought fetching
│   └── useCache.ts      # SWR hooks for all data types
└── styles/
    └── thoughts.css
```
