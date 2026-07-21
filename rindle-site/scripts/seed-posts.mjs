// Seed the `post` table from the legacy site's static markdown (../content/*.md).
//
// This is the bulk-import counterpart to the app's user-driven optimistic mutators: it renders each
// markdown file to HTML once and writes it straight to the daemon over parameterized raw SQL, rather
// than through a mutator (there is no user, no optimism — it's an admin data load). Run it with the
// connection `rindle exec` derives from rindle.ncl:
//
//     pnpm seed            # = rindle exec -- node scripts/seed-posts.mjs   (topology must be up)
//
// Scope (first port): STATIC markdown only. `.mdx` is skipped (comes later), and so is any file with no
// determinable date (the handful of undated utility pages) — "blog posts" here means the dated archive.
// Transclusion (`![](./x.md)`) and syntax highlighting are not resolved yet; the raw markdown is kept in
// `post.body` so posts can be re-rendered by a richer pipeline down the line.
//
// Idempotent: every row is an upsert keyed on the slug, so re-running re-renders in place.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { marked } from "marked";
import { createSqlClient } from "@rindle/sql-client";

const CONTENT_DIR = fileURLToPath(new URL("../../content/", import.meta.url));
const SKIP_FILES = new Set(["README.md"]);
const BATCH_SIZE = 40;

const UPSERT = `INSERT INTO post
  (id, title, date, publishedAt, description, tags, concern, author, form, kind, image, html, body)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title, date = excluded.date, publishedAt = excluded.publishedAt,
    description = excluded.description, tags = excluded.tags, concern = excluded.concern,
    author = excluded.author, form = excluded.form, kind = excluded.kind, image = excluded.image,
    html = excluded.html, body = excluded.body`;

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

  const date = resolveDate(filename, data.date);
  if (!date) return null; // undated utility page — out of scope for this first port

  const slug = String(data.slug || filename.replace(/\.md$/, ""));
  const title = data.title ? String(data.title) : slug.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
  const publishedAt = Date.parse(`${date}T00:00:00Z`);

  return [
    slug,
    title,
    date,
    publishedAt,
    data.description ? String(data.description) : "",
    JSON.stringify(toStringArray(data.tags)),
    JSON.stringify(toStringArray(data.concern)),
    JSON.stringify(toStringArray(data.author)),
    data.form ? String(data.form) : null,
    data.kind ? String(data.kind) : null,
    data.image ? String(data.image) : null,
    renderMarkdown(content),
    content,
  ];
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

  console.log(`Rendered ${rows.length} posts (skipped ${skipped} undated), writing to ${url} …`);

  const sql = createSqlClient({ url, authToken });
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await sql.batch(chunk.map((args) => ({ sql: UPSERT, args })));
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
