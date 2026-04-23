# Readwise-style Features for tantaman.com

Looking at the stack — thoughts with embeddings/UMAP, books via `#b`, bookmarks with OG metadata, framings canvases, MCP server — a few Readwise features would slot in naturally and a few would be redundant.

## Strong fit (leans on what you already have)

1. **Highlights as a first-class entity** attached to existing book (`#b`) and bookmark records. Same treatment as thoughts: embed via `bge-base-en-v1.5`, color via PCA basis, show up on the UMAP graph. Suddenly "what have I read that relates to X?" becomes one semantic-search call.
2. **Highlight → Thought quoting** — a thought can cite a highlight (like version chains, but across entities). Turns passive reading into a writing prompt and keeps the provenance.
3. **Framings integration** — drag highlights onto knowledge canvases next to thoughts and blog posts. This is probably the biggest differentiator over Readwise, since the whole point of framings is cross-entity synthesis.
4. **MCP tools** — `search_highlights`, `list_highlights_by_book`. Lets you pull highlights into conversations the same way you pull thoughts today.
5. **Daily resurfacing on `/now`** — one or two random old highlights. The Now page pattern already exists; spaced-repetition flashcards are overkill, but gentle resurfacing is high-leverage.

## Also worth considering

6. **Restacks/retweets as a distinct entity** (not just a bookmark) — bookmarks mean "I want to find this later"; amplifications mean "I endorsed this publicly." Worth separating so the knowledge graph can reason about them differently. Or model as bookmark + `amplified: true` flag.
7. **Public per-book pages** (`/books/:slug`) showing cover, your highlights, and linked thoughts. Cheap to build once highlights exist, great for sharing.
8. **Import pipelines**: Kindle `My Clippings.txt` parser (easiest — upload file, worker parses), Substack via the Readwise-style email forward endpoint, X via bookmarks export.

## Skip (redundant with what you have)

- Full "Reader" app (RSS, read-later) — the paste bin + bookmarks already cover ad-hoc capture, and building an RSS reader is a separate product.
- Heavyweight flashcard/mastery mode — doesn't match the "capture and connect" vibe of the rest of the system.

## Suggested v1 scope

- Highlights as first-class entity (#1)
- Highlight → Thought quoting (#2)
- Kindle `My Clippings.txt` import
- MCP `search_highlights`

Gets ~80% of Readwise value plugged into the existing graph/search. Framings integration (#3) and public book pages (#7) become almost free afterward.
