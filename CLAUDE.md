# CLAUDE.md

A personal knowledge management and blogging platform (tantaman.com). Static blog compiled from markdown/MDX, plus a Cloudflare Worker backend powering a microblog (thoughts), paste bin, TTS, semantic search, knowledge graph canvases, media curation, and an MCP server. Everything is oriented around capturing, connecting, and surfacing ideas.

## Development

- `pnpm build` - Build the compiler (TypeScript), frontend, thoughts packages, then compile all content
- `pnpm dev` - Watch mode: rebuilds on compiler or content changes, runs dev server with live reload
- `pnpm serve` - Start a static server serving `./docs/`. `pnpm dev` already serves by default.
- `pnpm build --force` - Force rebuild all content (bypasses mtime cache)

The build uses a file modification time cache (`.build-cache.json`) to skip unchanged files. The compiler auto-detects its own changes via `.tsbuildinfo` and forces a full rebuild when needed.

### Useful Scripts

- `pnpm relationships` - Build the compiler, then generate `.relationships.json` for related post suggestions (uses embeddings)
- `pnpm search-index` - Build the compiler, generate the search index, and upload it to Cloudflare R2 (`tantaman-site/search.json`). The index is **not committed** — the worker serves it at `tantaman.com/search.json` from the `SITE_BUCKET` R2 bucket. A local `docs/search.json` is still written (gitignored) for dev. Use `pnpm upload-search-index` to re-upload without regenerating.
- `pnpm fetch-chat` - Fetch and format chat transcripts
- `pnpm chat-embeddings` - Generate embeddings for chat content
- `pnpm summaries` - Generate AI summaries for posts (uses Anthropic SDK)
- `pnpm theses` - Generate thesis statements for posts (uses Anthropic SDK)
- `pnpm todos` - Find TODO comments in TypeScript files
- `pnpm thought-projection` - Compute PCA basis for thought embedding→color projection and backfill existing thought colors (requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`). The frozen PCA basis lives in `worker/src/color-projection.ts`. **Re-run periodically** (e.g. every few hundred new thoughts) to keep colors well-distributed as the corpus grows.

### Local Environment Utilities

Not part of the repo, but useful from WSL:
- `keep-awake {on|off|status}` (`~/.local/bin/keep-awake`) — toggles Windows sleep via `powercfg.exe`. Saves current AC/DC standby timeouts to `~/.local/state/keep-awake.state` on `on`, restores them on `off`. Use before starting a long remote-control session.

## Package Management

- **pnpm only** - Enforced via `only-allow` preinstall script; `npm` and `yarn` will fail
- pnpm workspace with packages in `./packages/` and `./worker/` (see `pnpm-workspace.yaml`)
- Node.js >= 17 required
- All packages use `"type": "module"` (ESM)

## Git Hooks

- `core.hooksPath` is set to `.githooks/` via the `prepare` script
- **pre-push**: Builds the `packages/thoughts` Vite app and fails if `docs/thoughts/` has uncommitted changes after the build

## Repository Structure

```
.
├── content/              # Source markdown, MDX, and generator files
├── docs/                 # Compiled HTML output (served as the site)
├── packages/
│   ├── compiler/         # Custom site compiler (@tantaman/sitecompiler)
│   ├── frontend/         # Shared React components (charts, diagrams, figures)
│   ├── thoughts/         # Vite React SPA — microblog, graph, framings, media curation
│   └── server/           # Server utilities (WhatsApp provider interface)
├── worker/               # Cloudflare Worker (D1, R2, KV, Vectorize, Workers AI, MCP)
├── scripts/              # AI generation (embeddings, summaries, theses, TTS, Substack import)
├── publishing/           # Pandoc-based book compilation (EPUB/PDF)
└── .githooks/            # Git hooks (pre-push)
```

## Compiler Package (`packages/compiler`)

The core of the site. Published as `@tantaman/sitecompiler` in the workspace, providing CLI binaries and library exports.

### CLI Binaries

Defined in `packages/compiler/package.json` `"bin"`:
- `sitecompiler` - Builds all collections in parallel
- `sitecompiler-watch` - Watch mode with live reload dev server
- `fetch-chat` - Fetch chat transcripts
- `relationships` - Generate post relationship data
- `search-index` - Generate search index

### Unified Pipeline

Content processing uses unified.js with this plugin chain:

**Remark (Markdown parsing):**
1. `remark-parse` - Parse markdown to MDAST
2. `remark-frontmatter` - Recognize YAML frontmatter blocks
3. Custom `vfile-matter` plugin - Extract frontmatter to `file.data.matter` and strip it
4. `remark-transclusion` (custom) - Embed files via `![](./path/to/file.md)` syntax
5. `remark-gfm` - GitHub Flavored Markdown (tables, strikethrough, etc.)
6. `remark-wiki-link` - Convert `[[page-name]]` to `/page-name` links
7. `remark-rehype` - Convert MDAST to HAST (HTML AST)

**Rehype (HTML processing):**
1. `rehype-infer-description-meta` - Extract first 255 chars as meta description
2. `rehype-infer-title-meta` - Infer title from first h1
3. `rehype-slug` - Add `id` attributes to headings
4. `@jsdevtools/rehype-toc` - Generate table of contents from h1/h2
5. `rehype-infer-reading-time-meta` - Calculate reading time
6. `rehype-autolink-headings` - Add permalink anchors to headings
7. `rehype-highlight` - Syntax highlighting (clojure, typescript, javascript, java, xml, rust)
8. `inject-layout-css` (custom) - Add layout-specific CSS links
9. `rehype-document` (custom) - Wrap in full HTML document with global CSS/JS
10. `rehype-social-preview` (custom) - Generate OG/Twitter meta tags
11. `rehype-meta` - Inject meta tags
12. `layout` (custom) - Apply layout-specific HTML transformations (header, footer, related posts)
13. `rehype-stringify` - Serialize HAST to HTML string

### File Handlers

Located in `packages/compiler/src/handlers.js`. Handler dispatched by file extension:

| Extension | Behavior |
|-----------|----------|
| `.md`     | Full remark+rehype pipeline |
| `.mdx`    | MDX compilation with React, creates companion `.js` file |
| `.js`     | Custom page generator - module's default export receives `(file, cwd, files)` and returns content (can be a function for deferred evaluation) |
| `.jsx`    | esbuild bundling with `esm.sh` for bare imports |
| `.html`   | Direct rehype processing (skips remark stage) |
| `.json`   | JSON passthrough |

### Layouts

Defined in `packages/compiler/src/layouts/`. Selected via `layout` frontmatter property (defaults to `default`).

| Layout | File | Description |
|--------|------|-------------|
| `default` | `defaultLayout.tsx` | Full blog post layout: header with nav/theme toggle, title, main content, related posts footer |
| `mirrorRoom` | `mirrorRoomLayout.tsx` | Minimal story layout: no header/nav, custom CSS |
| `chat` | `chatLayout.tsx` | Chat conversation layout: `<hr>` separates user/assistant messages, alternating styled blocks |
| `bare` | `bareLayout.tsx` | No-op: content controls its own HTML entirely |

### Build Caching

- Cache stored in `.build-cache.json` at repo root
- For `.md`/`.mdx`/`.html`: caches file mtime, rebuilds when mtime changes
- For `.js` generators: caches own mtime plus dependency snapshots (directory listings and file mtimes)
- Force rebuild when compiler `.tsbuildinfo` changes or `--force` flag passed
- Cache also tracks `.jsx` artifacts separately

## Content Structure

### Collections

Defined in `packages/compiler/src/collections.ts`:
```
['', 'bookmarks/', 'notes/', 'the-mirror-room/', 'chats/', 'pages/']
```

Each collection maps to `./content/<collection>/` and outputs to `./docs/<collection>/`.

| Collection | Directory | Content Type | Naming Convention |
|------------|-----------|-------------|-------------------|
| Root (`''`) | `content/` | Blog posts | `YYYY-MM-DD-title.md` or `.mdx` |
| `bookmarks/` | `content/bookmarks/` | Curated links | `domain.com.md` |
| `notes/` | `content/notes/` | Research notes | Descriptive name (spaces ok) |
| `the-mirror-room/` | `content/the-mirror-room/` | Short stories | `NN-title.md` (numbered) |
| `chats/` | `content/chats/` | LLM conversations | `YYYY-MM-DD-topic.md` |
| `pages/` | `content/pages/` | Static pages | Any name |

### Custom Page Generators

`.js` files in content root generate pages dynamically at build time:
- `content/index.js` - Blog index/homepage (masonry card layout with featured posts)
- `content/feed.js` - RSS feed generation
- `content/tags.js` - Tag index pages
- `content/graph.js` - Content relationship graph
- `content/stories.js` - Stories index

These export a default async function and can declare `dependencies` (array of paths) so the build cache knows when to re-run them.

### Frontmatter Fields

Standard YAML frontmatter between `---` delimiters:

```yaml
---
title: 'Post Title'           # Required: page title
tags: [software, programming]  # Optional: array of tags for categorization and related posts
description: 'Meta desc'       # Optional: override auto-inferred meta description
summary: 'Longer summary'      # Optional: summary shown on index cards
layout: default                # Optional: layout name (default, mirrorRoom, chat, bare)
related: [other-post.md]       # Optional: manually specify related posts by filename
wide: true                     # Optional: enable wide layout
concern: [craft, power]        # Optional: thematic concern categories
image: '/path/to/image.png'    # Optional: hero/card image
date: '2025-01-15'             # Optional: explicit date (otherwise extracted from filename)
minimalHeader: true            # Optional: show minimal header
noHeader: true                 # Optional: hide header entirely
kind: original                 # Optional: original or survey
js: ['/custom.js']             # Optional: additional JS to inject (mainly for MDX)
---
```

### Content Taxonomy

The browse/tags page uses a three-facet taxonomy. Use existing values — do not introduce new tags without intent.

**Subject** (frontmatter `tags`): philosophy, politics, software, culture, religion, economics, fiction, history, ai, math

**Concern** (frontmatter `concern`): power, ground, modernity, self, knowledge, craft, systems

**Form** (frontmatter `form`): essay, story, chat, interactive, meditation, prophecy
- When `form` is omitted it is inferred: `the-mirror-room/` → story, `chats/` → chat, `standalone: html` → interactive, otherwise → essay

**Kind** (frontmatter `kind`): original, survey

### Special Markdown Features

- **Wiki links**: `[[page-name]]` converts to a link to `/page-name`
- **Transclusion**: `![](./path/to/file.md)` embeds the entire file's content inline
- **GFM**: Tables, strikethrough, task lists, and other GitHub Flavored Markdown
- **Syntax highlighting**: Fenced code blocks with language hints for clojure, typescript, javascript, java, xml, rust

### Related Posts System

The default layout footer shows up to 5 related posts, sourced (in priority order):
1. Computed relationships from `.relationships.json` (generated by `pnpm relationships` using embeddings)
2. Manual relationships from `related` frontmatter field
3. Tag-based suggestions: posts sharing 2+ tags, ranked by overlap count

## Thoughts App (`packages/thoughts`)

A React 19 + Vite SPA (hash-routed, built to `docs/thoughts/`) for personal microblogging and knowledge curation.

### Core Features
- **Thought feed** — Markdown micro-posts with file attachments (drag & drop, paste from clipboard), voice dictation (browser Speech API), privacy toggle, and version chains (edit creates new version linked to original)
- **Threaded replies** — Recursive reply nesting with depth limit, version history navigation
- **Semantic search** — Embedding-based search with similarity scores
- **Tag filtering** — Auto-extracted `#hashtags`, AND-logic multi-tag filtering in sidebar

### Structured Tags (parsed from thought body)
- `#t <title>` — Creates a task (shown in Tasks view, toggleable complete/deprioritized)
- `#e <date> [<time>] <title>` — Creates an event (calendar view with month navigation)
- `#l <place>` — Creates a location (Leaflet map with Mapbox geocoding)
- `#m <title>` — Logs a movie (TMDB lookup for poster/year/rating)
- `#b <title>` — Logs a book (OpenLibrary lookup for cover/author/year)
- `#a <title>` — Logs an album (iTunes lookup for cover/artist/year/genre)
- Markdown links and bare URLs — Auto-extracted as bookmarks (OG metadata fetched)

### Visualization
- **Thought graph** — Canvas-rendered UMAP projection of thought embeddings; nodes sized by reply count, colored by PCA-projected embedding; adjustable similarity-threshold edges; pan/zoom/click-to-navigate
- **Framings** — ReactFlow-based knowledge graph canvases: drag thoughts and blog posts onto a canvas, create labeled directed edges between them, hierarchical auto-layout, import/export JSON

### Other Views
- **Media gallery** — Image grid with lightbox, color-coded borders from thought color
- **Movies/Books** — Poster/cover grids with inline metadata editing (TMDB/OpenLibrary URL pasting)
- **Bookmarks** — OG-preview cards with refetch capability
- **Tasks** — Checkbox list with complete/deprioritize toggles, tag filtering
- **Events** — Calendar widget with day-click event display
- **Locations** — Leaflet map + list with geocoding trigger

## Worker (`./worker/`)

Cloudflare Worker with D1, R2, KV, Vectorize, and Workers AI.

### Thoughts API
- CRUD with attachment upload to R2, auto-embedding via `@cf/baai/bge-base-en-v1.5`, color projection via frozen PCA basis
- Reply threading, version chains (`supersede_by`), cascade delete with R2 cleanup
- Tag/task/event/location/movie/book/bookmark extraction on create
- Thought graph endpoint (all thoughts with embeddings for UMAP)
- Version counter + ETag caching (304 responses)

### Paste Bin (`/paste`)
- Create/view code and markdown snippets (12+ languages)
- JSX/TSX pastes compile via Sucrase and run as live React apps (esm.sh imports)
- HTML pastes render directly (full document or fragment)
- Markdown pastes render with `marked`; TTS "listen" button via Durable Workflow
- Cookie-based web auth + Bearer token API auth
- Raw content endpoint

### TTS (Text-to-Speech)
- Durable Workflow: chunks markdown into ~1900-char segments, generates MP3 via `@cf/deepgram/aura-2-en`, stores chunks in R2, concatenates final audio
- Streaming playback: client polls for chunks and starts playing as they generate
- Cached in R2 with immutable cache headers

### MCP Server
- `search_blog` — Semantic search over blog post embeddings (top-8 passages)
- `search_thoughts` — Semantic search over thought embeddings (configurable top-K)
- `browse_posts` — Filter posts by subject/concern/form facets
- `list_posts` — Browse posts by date range with metadata
- `list_thoughts` — Chronological thought browsing with pagination

### Other Worker Features
- **Now page** (`/now`) — Dynamic page showing latest thoughts, tasks, events, books, movies
- **iCal export** — Token-protected `.ics` endpoint for events
- **Instagram card generator** (`/api/ig-card`) — Satori + resvg WASM → 1080x1920 PNG cards for blog posts
- **Comments** — OTP email auth via Resend, JWT sessions, threaded comments with likes
- **DHA reports** — JSON report storage by date
- **Documents API** — CRUD for documents (title, body, private, slug, status, frontmatter). A document can be `status='document'` (personal note), `status='draft'` (post-in-progress), or `status='published'` (live post). Slug and frontmatter are optional and only meaningful when status is draft/published.
- **Framings API** — CRUD for knowledge graph canvases with nodes, edges, batch position updates

## Scripts (`./scripts/`)

AI-powered generation and content tooling:
- `generate-descriptions.mjs` — AI meta descriptions via Anthropic SDK (dry-run support)
- `generate-theses.mjs` — Thesis statements via Anthropic SDK (cached, dry-run)
- `generate-embeddings.mjs` — Chat content embeddings via Cloudflare Workers AI
- `compute-thought-projection.mjs` — PCA basis from Vectorize, backfills thought colors in D1
- `convert-substack.mjs` — Import Substack posts to markdown (downloads images, HTML→MD)
- `generate-tts.py` — Local Kokoro TTS for posts with `audio: true` frontmatter → `docs/audio/`
- `generate-book-tts.py` — TTS for book chapters

## Publishing (`./publishing/`)

Pandoc-based book compilation to EPUB/PDF:
- `epub3.template` — EPUB3 template with SVG cover support
- `pagebreak.lua` — Lua filter for cross-format pagebreaks
- Book projects: `religion-book/`, `self-cage-wheel-ground/`, `mirror-room-collection/`

## Frontend Components (`packages/frontend`)

Shared React components used in MDX posts:
- `Figure.jsx` — Responsive image with caption/source
- `Mermaid.js` — Mermaid diagram renderer (dark theme)
- `PullQuote.jsx` — Styled blockquote
- Data visualizations (Recharts): `IncomeFertilityParadox`, `FertilityByReligiosity`, `IncomeFertilityUCurve`, `IsraelEducationFertility`
- `SankeyDiagram.jsx` — Canvas-based flow diagram with color scoring
- `Timeline.jsx` — Interactive vertical timeline with color interpolation

## Global Configuration

Site metadata is in `packages/compiler/src/layouts/global.ts`:
- Site name: "Tantamanlands"
- Author: Matt Wonlaw
- Twitter: @tantaman
- Global CSS: `/index.css`
- Global JS: Google Analytics, `toc.js`, `theme.js`
- Theme detection: inline script in `<head>` reads `localStorage` or `prefers-color-scheme`
- RSS feed link in `<head>`

## Adding New Content

### New Blog Post
1. Create `content/YYYY-MM-DD-slug-title.md` with frontmatter
2. Run `pnpm build` (or use `pnpm dev` for auto-rebuild)
3. Output appears at `docs/YYYY-MM-DD-slug-title.html`

### New Collection
1. Create directory under `content/`
2. Add the collection name (with trailing `/`) to the array in `packages/compiler/src/collections.ts`
3. Rebuild the compiler: `cd packages/compiler && pnpm build`
4. Run `pnpm build`

### New Layout
1. Create a layout `.tsx` file in `packages/compiler/src/layouts/`
2. Register it in `packages/compiler/src/layouts/layouts.js`
3. Rebuild the compiler
4. Use via `layout: yourLayout` in frontmatter
