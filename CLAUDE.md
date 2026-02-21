# CLAUDE.md

A personal content-driven website (tantaman.com) with a custom static site compiler. Markdown and MDX files in `./content/` are compiled to HTML in `./docs/` using a unified.js pipeline with custom plugins, layouts, and caching.

## Development

- `pnpm build` - Build the compiler (TypeScript), frontend, thoughts packages, then compile all content
- `pnpm dev` - Watch mode: rebuilds on compiler or content changes, runs dev server with live reload
- `pnpm serve` - Start a static server serving `./docs/`. `pnpm dev` already serves by default.
- `pnpm build --force` - Force rebuild all content (bypasses mtime cache)

The build uses a file modification time cache (`.build-cache.json`) to skip unchanged files. The compiler auto-detects its own changes via `.tsbuildinfo` and forces a full rebuild when needed.

### Useful Scripts

- `pnpm relationships` - Build the compiler, then generate `.relationships.json` for related post suggestions (uses embeddings)
- `pnpm search-index` - Build the compiler, then generate search index
- `pnpm fetch-chat` - Fetch and format chat transcripts
- `pnpm chat-embeddings` - Generate embeddings for chat content
- `pnpm summaries` - Generate AI summaries for posts (uses Anthropic SDK)
- `pnpm theses` - Generate thesis statements for posts (uses Anthropic SDK)
- `pnpm todos` - Find TODO comments in TypeScript files

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
│   ├── frontend/         # Shared frontend components (Mermaid, Figure)
│   ├── thoughts/         # Vite React app (built to docs/thoughts/)
│   └── server/           # Server utilities
├── worker/               # Cloudflare Worker (D1 database, MCP server)
├── scripts/              # AI-powered generation scripts (embeddings, summaries, theses)
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
js: ['/custom.js']             # Optional: additional JS to inject (mainly for MDX)
---
```

### Content Taxonomy

The browse/tags page uses a three-facet taxonomy. Use existing values — do not introduce new tags without intent.

**Subject** (frontmatter `tags`): philosophy, politics, software, culture, religion, economics, fiction, history, ai, math

**Concern** (frontmatter `concern`): power, ground, modernity, self, knowledge, craft, systems

**Form** (frontmatter `form`): essay, story, chat, interactive, meditation, prophecy
- When `form` is omitted it is inferred: `the-mirror-room/` → story, `chats/` → chat, `standalone: html` → interactive, otherwise → essay

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

## Worker (`./worker/`)

A Cloudflare Worker with D1 database for dynamic features:
- Thoughts/microblog system with attachments, replies, and tags
- Event tracking
- MCP (Model Context Protocol) server
- Task management
- Embeddings support

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
