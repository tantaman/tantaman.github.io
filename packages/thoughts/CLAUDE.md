# packages/thoughts

A short-form thought capture app — a microblog / second brain. Thoughts are auto-organized into tasks, events, locations, movies, and books via structured tags. Built as a Vite React SPA served at `/thoughts/`.

## Tech Stack

React 19, Vite, SWR (data fetching), Leaflet (maps), @xyflow/react (graph canvases), marked (markdown rendering). TypeScript throughout.

## Structured Tags

Thoughts are plain text with markdown support. Special tags at the start of a line extract structured data into separate database tables on the backend:

| Tag | Purpose | Syntax | Enrichment |
|-----|---------|--------|------------|
| `#t` | Task | `#t Fix the bug` | Completable/deprioritizable in tasks view |
| `#e` | Event | `#e 03/15/2025 3pm Team sync` | Date parsing, calendar view |
| `#l` | Location | `#l San Francisco` | Mapbox geocoding → lat/lng, Leaflet map |
| `#m` | Movie | `#m The Matrix` | Media gallery |
| `#b` | Book | `#b Gödel Escher Bach` | Media gallery |

Lines following a tag are captured as its description until the next tag or end of body.

## Search

Embedding-based semantic search via the backend (`/api/thoughts/search`). Results include a similarity score. Tag filtering is separate — AND logic across selected tags via the sidebar.

## Framings

Framings are interactive graph canvases (ReactFlow) for spatially organizing thoughts and blog posts. Nodes are draggable, edges are labeled and directed. Double-click canvas to compose inline. Used for intentional curation vs. the chronological feed.

## Views / Routes

Hash-based client-side routing (`#tasks`, `#events`, `#thought-{id}`, etc.):

| Route | View | Description |
|-------|------|-------------|
| `#` | Feed | Chronological thought stream with search and compose |
| `#thought-{id}` | Thread | Parent thought + replies |
| `#tasks` | Tasks | Filterable task list with complete/deprioritize toggles |
| `#events` | Events | Calendar with event highlights |
| `#locations` | Locations | Leaflet map + location list |
| `#media` | Media | Lightbox gallery of attachments |
| `#movies` | Movies | Movie list |
| `#books` | Books | Book list |
| `#framings` | Framings | List of graph canvases |
| `#framing-{id}` | Framing | Single ReactFlow canvas |

## Build

- `pnpm dev` — Vite dev server (proxies non-`/thoughts/` requests to `tantaman.com`)
- `pnpm build` — Production build to `../../docs/thoughts/` (served at `/thoughts/`)
- Pre-push hook rebuilds this app and fails if `docs/thoughts/` has uncommitted changes

## Backend

Cloudflare Worker in `../../worker/`. API at `https://tantaman.com/api`. Auth via `Authorization: Bearer {secret}` header (secret stored in localStorage). Read endpoints are public; writes require auth.

## Source Structure

```
src/
├── App.tsx              # Router, auth context, layout switching
├── api.ts               # All API calls (fetch wrappers)
├── types.ts             # TypeScript interfaces
├── auth.ts              # localStorage secret management
├── markdown.ts          # marked config + hashtag highlighting
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
