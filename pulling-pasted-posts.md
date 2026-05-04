# Pulling Pasted Posts

Workflow for turning a `https://tantaman.com/paste/<id>` link into a published post in `content/`.

## 1. Fetch the raw paste

Append `/raw` to the URL and use WebFetch. The `/raw` endpoint returns the unrendered markdown.

```
https://tantaman.com/paste/<id>/raw
```

WebFetch prompt should ask for the content **verbatim** with no commentary, summarization, or truncation. Without an explicit "verbatim" instruction the fetcher may summarize long pastes.

If multiple paste links arrive in one message, fetch them in parallel (one message, multiple WebFetch calls).

## 2. Pick a filename

Posts go directly under `content/` and follow:

```
content/YYYY-MM-DD-<slug>.md
```

- Date = today (use the `currentDate` from auto-memory, not the post's apparent date).
- Slug = kebab-case derived from the title. Drop articles ("the", "a") only if it would otherwise collide; the existing corpus keeps them (`the-listener`, `the-lamp`, `the-cause`).
- If multiple posts ship the same day, that's fine — they share the date prefix.

## 3. Frontmatter

Use this template:

```yaml
---
title: 'Post Title'
tags: [subject1, subject2]
concern: [concern1, concern2]
form: essay        # or story, chat, meditation, prophecy, interactive
author: [tantaman, claude]
---
```

### Taxonomy

The browse/tags page expects values from a small taxonomy. **Do not invent new tags casually.** Pick from existing values where possible — but the user's actual corpus drifts from the strict CLAUDE.md list (e.g. `formation`, `civilization`, `modernity` show up as `concern` values). When unsure, grep recent posts in the same theme and copy what they use.

- **tags** (subject): philosophy, politics, software, culture, religion, economics, fiction, history, ai, math, self
- **concern**: power, ground, modernity, self, knowledge, craft, systems, formation, civilization
- **form**: essay, story, chat, interactive, meditation, prophecy
- **author**: `[tantaman, claude]` for Claude-collaborated pieces

### Title and H1 handling

If the paste begins with `# Title`, **drop the H1** from the body — the frontmatter `title` already renders as the page heading. A subtitle (H2 or italic line under the H1) should stay; it works as a lead.

Listener and Jesuit-formation posts follow this convention. A few older posts (e.g. `formed-self.md`) keep both, but the cleaner pattern is frontmatter-only.

### Preserve formatting quirks

If the paste uses unusual section dividers (e.g. `-----` instead of `---`), keep them as-is — they're stylistic choices, not errors.

## 4. Cross-link intentionally paired posts

For posts that are clearly companions (a trilogy, a story-and-essay pair, an explicit "previous essay"/"companion to" reference), add a `> Related:` blockquote at the very top of the body, after the frontmatter:

```markdown
> Related:
> - [[2026-05-03-other-post-slug:Other Post Title]]
> - [[2026-05-03-third-post-slug:Third Post Title]]
```

The wiki-link syntax `[[slug:Display Text]]` is handled by the `remark-wiki-link` plugin and renders as a link to `/slug` with the given display text.

This is for **explicit pairings only** — the related-posts footer is computed automatically from embeddings + tag overlap by `pnpm relationships`, so don't manually link merely-similar posts. Reserve inline `Related:` for posts the user wrote as a set.

The listener post (`content/2026-04-18-the-listener.md`) is the canonical example of this pattern.

## 5. Artwork

Images go in `docs/img/` and are referenced as `/img/<filename>` from posts:

```markdown
![Artist Name or short caption](/img/artist-subject.jpg)
```

### Naming convention

`<artist-or-source>-<subject>.<ext>` — lowercase, hyphenated. Examples from the existing corpus:
- `yoshitoshi-listener.jpg`
- `scheffer-paolo-francesca.jpg`
- `pozzo-sant-ignazio-ceiling.jpg`
- `bruegel-tower-of-babel.jpg`
- `david-napoleon-study.jpg`

Most are public-domain paintings or woodblock prints. The artist surname comes first so files sort by artist.

### Where to find images

The user typically picks artwork himself — a specific painting, woodblock, photograph, or diagram that resonates with the piece's theme. **Do not invent or download images without being asked.** If a post seems to want a hero image, ask the user what they want, or note it as a TODO. Wikimedia Commons is the usual source for public-domain art.

### Frontmatter image field

Optional `image:` frontmatter field for the social-card / OG image (separate from inline images):

```yaml
image: '/img/artist-subject.jpg'
```

Set this when there's a clear hero image worth surfacing on link previews and the index masonry.

## 6. Don't (yet) build or commit

After writing the file:
- Don't run `pnpm build` unless asked — the user has `pnpm dev` running often.
- Don't run `pnpm relationships` unless asked — it regenerates `.relationships.json` and is slow.
- Don't `git add` or `git commit` unless explicitly asked.

Just confirm the file path and the taxonomy choices. The user will integrate from there.
