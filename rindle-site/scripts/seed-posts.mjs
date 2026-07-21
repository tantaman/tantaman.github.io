// Seed the `post` table from the legacy site's static markdown (../content/*.md).
//
// This is the bulk-import counterpart to the app's user-driven optimistic mutators: it renders each
// markdown file to HTML once and writes it straight to the daemon over parameterized raw SQL, rather
// than through a mutator (there is no user, no optimism — it's an admin data load). Run it with the
// connection `rindle exec` derives from rindle.ncl:
//
//     pnpm seed            # = rindle exec -- node scripts/seed-posts.mjs   (topology must be up)
//
// Scope (first port): STATIC markdown only. `.mdx` is skipped (comes later), as are undated utility
// pages other than the explicitly pinned `start-here.md` home card.
// Transclusion (`![](./x.md)`) and syntax highlighting are not resolved yet; the raw markdown is kept in
// `post.body` so posts can be re-rendered by a richer pipeline down the line.
//
// Idempotent: every row is an upsert keyed on the slug, so re-running re-renders in place.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { marked } from "marked";
import { createSqlClient } from "@rindle/sql-client";

const CONTENT_DIR = fileURLToPath(new URL("../../content/", import.meta.url));
const LEGACY_MANIFEST = fileURLToPath(new URL("../../docs/posts-manifest.json", import.meta.url));
const LEGACY_MEME_CACHE = fileURLToPath(new URL("../../.meme-cache.json", import.meta.url));
const SKIP_FILES = new Set(["README.md"]);
const PINNED_SLUGS = new Set(["start-here"]);
const BATCH_SIZE = 20;
const LEGACY_COLOR_VERSION = "legacy-corpus-pca-v1";

const UPSERT_POST = `INSERT INTO post
  (id, title, date, publishedAt, description, thesis, tags, concern, author, form, kind, image, html, body,
   cardImage, pinned, readingMinutes, color, contentRevision, colorRevision,
   colorProjectionVersion, colorStatus)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title, date = excluded.date, publishedAt = excluded.publishedAt,
    description = excluded.description, thesis = excluded.thesis, tags = excluded.tags, concern = excluded.concern,
    author = excluded.author, form = excluded.form, kind = excluded.kind, image = excluded.image,
    html = excluded.html, body = excluded.body, cardImage = excluded.cardImage,
    pinned = excluded.pinned, readingMinutes = excluded.readingMinutes, color = excluded.color,
    contentRevision = excluded.contentRevision, colorRevision = excluded.colorRevision,
    colorProjectionVersion = excluded.colorProjectionVersion, colorStatus = excluded.colorStatus`;

const DELETE_POST_FACETS = "DELETE FROM postFacet WHERE postId = ?";
const UPSERT_POST_FACET = `INSERT INTO postFacet (id, postId, facet, value, position)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET postId = excluded.postId, facet = excluded.facet,
    value = excluded.value, position = excluded.position`;

const DELETE_POST_AUTHORS = "DELETE FROM postAuthor WHERE postId = ?";
const INSERT_AUTHOR = `INSERT INTO author (id, displayName, glyph, color) VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING`;
const UPSERT_POST_AUTHOR = `INSERT INTO postAuthor (id, postId, authorId, position)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET postId = excluded.postId, authorId = excluded.authorId,
    position = excluded.position`;

/** Import the old build's semantic colors once. Runtime consumers read the small `post.color` field;
 *  the static manifest remains only a compatibility input until live enrichment owns this column. */
function legacyColors() {
  try {
    const entries = JSON.parse(readFileSync(LEGACY_MANIFEST, "utf8"));
    if (!Array.isArray(entries)) return new Map();
    return new Map(
      entries
        .filter((entry) => entry && typeof entry.slug === "string" && /^#[0-9a-f]{6}$/i.test(entry.color))
        .map((entry) => [entry.slug, entry.color]),
    );
  } catch (err) {
    console.warn(`Could not import legacy post colors: ${err instanceof Error ? err.message : err}`);
    return new Map();
  }
}

const COLOR_BY_SLUG = legacyColors();

/** Import the legacy homepage's concise overlay copy. It is keyed by title in the static build's
 *  cache, then persisted on the post so the Rindle view has no runtime dependency on that file. */
function legacyTheses() {
  try {
    const entries = JSON.parse(readFileSync(LEGACY_MEME_CACHE, "utf8"));
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) return new Map();
    return new Map(
      Object.entries(entries)
        .filter(([title, thesis]) => title.trim() && typeof thesis === "string" && thesis.trim())
        .map(([title, thesis]) => [title, thesis.trim()]),
    );
  } catch (err) {
    console.warn(`Could not import legacy post theses: ${err instanceof Error ? err.message : err}`);
    return new Map();
  }
}

const THESIS_BY_TITLE = legacyTheses();

/** Coerce a frontmatter value that may be a scalar or a list into a clean string[]. */
function toStringArray(value) {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => String(v).trim()).filter(Boolean);
}

/** Normalize a date to "YYYY-MM-DD": prefer the filename prefix, else frontmatter `date` (which YAML may
 *  have parsed to a Date). Returns null when there is no determinable date. */
function resolveDate(filename, fmDate) {
  const fromName = /^(\d{4}-\d{2}-\d{2})-/.exec(filename);
  if (fromName) return fromName[1];
  if (fmDate instanceof Date) return fmDate.toISOString().slice(0, 10);
  if (typeof fmDate === "string") {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(fmDate.trim());
    if (m) return m[1];
  }
  return null;
}

/** First Markdown image URL, matching the legacy homepage's card-thumbnail source. */
function firstImage(markdown) {
  const match = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/m.exec(markdown);
  return match ? match[1] || match[2] || null : null;
}

/** Legacy reading-time convention: body word count divided by 200, rounded, minimum one minute. */
function readingMinutes(markdown) {
  const text = markdown
    .split("\n")
    .filter((line) => !line.trim().startsWith("import "))
    .join("\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

/** Stable ids keep relationship upserts replayable without exposing delimiter assumptions. */
function relationshipId(...parts) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

/** The old UI treated an absent author as Tantaman; make that effective relationship explicit. */
function effectiveAuthors(value) {
  const authors = toStringArray(value);
  return authors.length > 0 ? authors : ["tantaman"];
}

function authorProfile(id) {
  if (id === "tantaman") return [id, "Tantaman", "T", null];
  if (id === "claude") return [id, "Claude", "✺", "#d97757"];
  const displayName = id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  return [id, displayName || id, id.slice(0, 1).toUpperCase(), null];
}

/** A wiki target → the site's `/slug` link (lowercased, spaces → hyphens), matching remark-wiki-link. */
const wikiSlug = (target) => "/" + target.trim().toLowerCase().replace(/\s+/g, "-");

/** Render post markdown → article HTML. Rewrites wiki links to the site's `/slug` scheme first, then
 *  hands the rest to marked (GFM on by default). The corpus uses the `[[slug:Label]]` COLON divider
 *  (remark-wiki-link's alias form); `|` and the plain `[[slug]]` form are supported too. The label may
 *  itself contain a colon ("Title: Subtitle"), so we split on the FIRST divider only. */
function renderMarkdown(md) {
  const withWikiLinks = md.replace(/\[\[([^\]]+)\]\]/g, (_all, inner) => {
    const at = inner.search(/[:|]/);
    const target = (at === -1 ? inner : inner.slice(0, at)).trim();
    const label = (at === -1 ? inner : inner.slice(at + 1)).trim() || target;
    return `[${label}](${wikiSlug(target)})`;
  });
  return marked.parse(withWikiLinks, { async: false });
}

/** Read + parse one markdown file into a `post` row, or null to skip it. */
function toRow(filename) {
  const raw = readFileSync(new URL(filename, `file://${CONTENT_DIR}`), "utf8");
  const { data, content } = matter(raw);

  const slug = String(data.slug || filename.replace(/\.md$/, ""));
  const date = resolveDate(filename, data.date);
  const pinned = PINNED_SLUGS.has(slug);
  if (!date && !pinned) return null; // undated utility page — not part of the blog index

  const title = data.title ? String(data.title) : slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
  const publishedAt = date ? Date.parse(`${date}T00:00:00Z`) : 0;
  const image = data.image ? String(data.image) : null;
  const tags = toStringArray(data.tags);
  const concerns = toStringArray(data.concern);
  const authors = effectiveAuthors(data.author);
  const color = COLOR_BY_SLUG.get(slug) ?? null;
  const contentRevision = createHash("sha256").update(content).digest("hex");

  return {
    slug,
    post: [
      slug,
      title,
      date,
      publishedAt,
      data.description ? String(data.description) : "",
      THESIS_BY_TITLE.get(title) ?? null,
      JSON.stringify(tags),
      JSON.stringify(concerns),
      JSON.stringify(toStringArray(data.author)),
      data.form ? String(data.form) : "essay",
      data.kind ? String(data.kind) : null,
      image,
      renderMarkdown(content),
      content,
      image || firstImage(content),
      pinned ? 1 : 0,
      readingMinutes(content),
      color,
      contentRevision,
      color ? contentRevision : null,
      color ? LEGACY_COLOR_VERSION : null,
      color ? "ready" : "pending",
    ],
    facets: [
      ...tags.map((value, position) => [relationshipId(slug, "tag", value), slug, "tag", value, position]),
      ...concerns.map((value, position) => [relationshipId(slug, "concern", value), slug, "concern", value, position]),
    ],
    authors: authors.map((authorId, position) => ({
      profile: authorProfile(authorId),
      link: [relationshipId(slug, "author", authorId), slug, authorId, position],
    })),
  };
}

async function main() {
  const url = process.env.RINDLE_URL;
  const authToken = process.env.RINDLE_DATABASE_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "RINDLE_URL + RINDLE_DATABASE_TOKEN are required — run via `pnpm seed` (rindle exec) with the topology up.",
    );
  }

  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md") && !SKIP_FILES.has(f))
    .sort();

  const rows = [];
  let skipped = 0;
  for (const file of files) {
    try {
      const row = toRow(file);
      if (row) rows.push(row);
      else skipped++;
    } catch (err) {
      console.error(`  ✗ ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(
    `Rendered ${rows.length} posts (${COLOR_BY_SLUG.size} colors and ${THESIS_BY_TITLE.size} theses available, skipped ${skipped} undated), writing to ${url} …`,
  );

  const sql = createSqlClient({ url, authToken });
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await sql.withTransaction(async (tx) => {
      const statements = [];
      for (const row of chunk) {
        statements.push({ sql: UPSERT_POST, args: row.post });
        statements.push({ sql: DELETE_POST_FACETS, args: [row.slug] });
        statements.push(...row.facets.map((args) => ({ sql: UPSERT_POST_FACET, args })));
        statements.push({ sql: DELETE_POST_AUTHORS, args: [row.slug] });
        for (const author of row.authors) {
          statements.push({ sql: INSERT_AUTHOR, args: author.profile });
          statements.push({ sql: UPSERT_POST_AUTHOR, args: author.link });
        }
      }
      await tx.batch(statements);
    });
    written += chunk.length;
    process.stdout.write(`\r  upserted ${written}/${rows.length}`);
  }
  process.stdout.write("\n");
  console.log(`Done — ${written} posts seeded.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
