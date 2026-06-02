import { Hono } from "hono";
import type { Env } from "./index";

interface TypeaheadResult {
  id: string;
  title: string;
  snippet?: string;
}

interface PostsManifestEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

export const typeahead = new Hono<{ Bindings: Env }>();

function isAuthed(c: { req: { header: (n: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function bodySnippet(body: string, query: string, max = 80): string {
  const trimmed = body.replace(/\s+/g, " ").trim();
  if (!query) return trimmed.slice(0, max) + (trimmed.length > max ? "…" : "");
  const lower = trimmed.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return trimmed.slice(0, max) + (trimmed.length > max ? "…" : "");
  const start = Math.max(0, idx - 20);
  const end = Math.min(trimmed.length, start + max);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < trimmed.length ? "…" : "";
  return prefix + trimmed.slice(start, end) + suffix;
}

async function searchDocuments(
  db: D1Database,
  q: string,
  limit: number,
  authed: boolean,
): Promise<TypeaheadResult[]> {
  const privateClause = authed ? "" : "private = 0";
  if (!q) {
    const where = privateClause ? `WHERE ${privateClause}` : "";
    const rows = await db.prepare(
      `SELECT id, title FROM document ${where} ORDER BY updated_at DESC LIMIT ?`,
    ).bind(limit).all<{ id: number; title: string }>();
    return rows.results.map((r) => ({ id: String(r.id), title: r.title }));
  }
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  const where = privateClause ? `(${privateClause}) AND` : "";
  const rows = await db.prepare(
    `SELECT id, title,
      CASE
        WHEN LOWER(title) LIKE LOWER(?) ESCAPE '\\' THEN 0
        WHEN LOWER(title) LIKE LOWER(?) ESCAPE '\\' THEN 1
        ELSE 2
      END AS rank
     FROM document
     WHERE ${where} (LOWER(title) LIKE LOWER(?) ESCAPE '\\' OR LOWER(body) LIKE LOWER(?) ESCAPE '\\')
     ORDER BY rank ASC, updated_at DESC
     LIMIT ?`,
  ).bind(prefix, like, like, like, limit).all<{ id: number; title: string }>();
  return rows.results.map((r) => ({ id: String(r.id), title: r.title }));
}

async function searchThoughts(
  db: D1Database,
  q: string,
  limit: number,
  authed: boolean,
): Promise<TypeaheadResult[]> {
  const privateClause = authed ? "" : "private = 0";
  const baseWhere = ["parent_id IS NULL"];
  if (privateClause) baseWhere.push(privateClause);
  if (!q) {
    const where = baseWhere.join(" AND ");
    const rows = await db.prepare(
      `SELECT id, body FROM thought WHERE ${where} ORDER BY timestamp DESC LIMIT ?`,
    ).bind(limit).all<{ id: number; body: string }>();
    return rows.results.map((r) => ({
      id: String(r.id),
      title: r.body.split(/\n/)[0].slice(0, 80) || `thought ${r.id}`,
      snippet: bodySnippet(r.body, ""),
    }));
  }
  const like = `%${escapeLike(q)}%`;
  const where = [...baseWhere, "LOWER(body) LIKE LOWER(?) ESCAPE '\\'"].join(" AND ");
  const rows = await db.prepare(
    `SELECT id, body FROM thought WHERE ${where} ORDER BY timestamp DESC LIMIT ?`,
  ).bind(like, limit).all<{ id: number; body: string }>();
  return rows.results.map((r) => ({
    id: String(r.id),
    title: r.body.split(/\n/)[0].slice(0, 80) || `thought ${r.id}`,
    snippet: bodySnippet(r.body, q),
  }));
}

async function searchPastes(
  db: D1Database,
  q: string,
  limit: number,
): Promise<TypeaheadResult[]> {
  // Only leaf pastes (no child forks).
  const leafClause = "NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id)";
  if (!q) {
    const rows = await db.prepare(
      `SELECT id, title FROM paste p WHERE ${leafClause} ORDER BY created_at DESC LIMIT ?`,
    ).bind(limit).all<{ id: string; title: string | null }>();
    return rows.results.map((r) => ({ id: r.id, title: r.title || `paste ${r.id}` }));
  }
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  const rows = await db.prepare(
    `SELECT id, title,
      CASE
        WHEN title IS NOT NULL AND LOWER(title) LIKE LOWER(?) ESCAPE '\\' THEN 0
        WHEN title IS NOT NULL AND LOWER(title) LIKE LOWER(?) ESCAPE '\\' THEN 1
        ELSE 2
      END AS rank
     FROM paste p
     WHERE ${leafClause} AND (
       (title IS NOT NULL AND LOWER(title) LIKE LOWER(?) ESCAPE '\\')
       OR LOWER(body) LIKE LOWER(?) ESCAPE '\\'
     )
     ORDER BY rank ASC, created_at DESC
     LIMIT ?`,
  ).bind(prefix, like, like, like, limit).all<{ id: string; title: string | null }>();
  return rows.results.map((r) => ({ id: r.id, title: r.title || `paste ${r.id}` }));
}

async function searchFrames(
  db: D1Database,
  q: string,
  limit: number,
): Promise<TypeaheadResult[]> {
  if (!q) {
    const rows = await db.prepare(
      `SELECT id, name, description FROM framing ORDER BY updated_at DESC LIMIT ?`,
    ).bind(limit).all<{ id: number; name: string; description: string | null }>();
    return rows.results.map((r) => ({
      id: String(r.id),
      title: r.name,
      snippet: r.description || undefined,
    }));
  }
  const like = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  const rows = await db.prepare(
    `SELECT id, name, description,
      CASE
        WHEN LOWER(name) LIKE LOWER(?) ESCAPE '\\' THEN 0
        WHEN LOWER(name) LIKE LOWER(?) ESCAPE '\\' THEN 1
        ELSE 2
      END AS rank
     FROM framing
     WHERE LOWER(name) LIKE LOWER(?) ESCAPE '\\'
        OR (description IS NOT NULL AND LOWER(description) LIKE LOWER(?) ESCAPE '\\')
     ORDER BY rank ASC, updated_at DESC
     LIMIT ?`,
  ).bind(prefix, like, like, like, limit).all<{ id: number; name: string; description: string | null }>();
  return rows.results.map((r) => ({
    id: String(r.id),
    title: r.name,
    snippet: r.description || undefined,
  }));
}

let postsManifestCache: PostsManifestEntry[] | null = null;
async function loadPostsManifest(): Promise<PostsManifestEntry[]> {
  if (postsManifestCache) return postsManifestCache;
  const res = await fetch("https://tantaman.com/posts-manifest.json");
  if (!res.ok) return [];
  postsManifestCache = (await res.json()) as PostsManifestEntry[];
  return postsManifestCache;
}

async function searchPosts(q: string, limit: number): Promise<TypeaheadResult[]> {
  const manifest = await loadPostsManifest();
  if (!q) {
    return [...manifest]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, limit)
      .map((p) => ({ id: p.slug, title: p.title }));
  }
  const lower = q.toLowerCase();
  const ranked = manifest
    .map((p) => {
      const title = (p.title || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const tagsStr = (p.tags || []).join(" ").toLowerCase();
      let rank = -1;
      if (title.startsWith(lower)) rank = 0;
      else if (title.includes(lower)) rank = 1;
      else if (desc.includes(lower)) rank = 2;
      else if (tagsStr.includes(lower)) rank = 3;
      return { p, rank };
    })
    .filter((x) => x.rank >= 0);
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (b.p.date || "").localeCompare(a.p.date || "");
  });
  return ranked.slice(0, limit).map(({ p }) => ({
    id: p.slug,
    title: p.title,
    snippet: p.description || undefined,
  }));
}

typeahead.get("/", async (c) => {
  const kind = c.req.query("kind") || "";
  const q = (c.req.query("q") || "").trim();
  const limit = Math.min(parseInt(c.req.query("limit") || "10", 10) || 10, 25);
  const authed = isAuthed(c);

  let results: TypeaheadResult[] = [];
  switch (kind) {
    case "d": results = await searchDocuments(c.env.DB, q, limit, authed); break;
    case "t": results = await searchThoughts(c.env.DB, q, limit, authed); break;
    case "p": results = await searchPastes(c.env.DB, q, limit); break;
    case "f": results = await searchFrames(c.env.DB, q, limit); break;
    case "b": results = await searchPosts(q, limit); break;
    default: return c.json({ error: "Invalid kind. Use d|t|p|f|b" }, 400);
  }

  return c.json({ kind, q, results });
});
