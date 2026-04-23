import { Hono } from "hono";
import type { Env } from "./index";

export const clusters = new Hono<{ Bindings: Env }>();

const TOP_K = 5;

interface ClusterData {
  version: number;
  k: number;
  centroids: number[][];
  labels: { id: number; label: string; size: number }[];
}

// Module-level cache (per-isolate). Invalidated when `clusters:version` changes.
let cachedData: ClusterData | null = null;
let cachedVersion: string | null = null;

async function getClusterData(env: Env): Promise<ClusterData | null> {
  const version = await env.KV.get("clusters:version");
  if (!version) return null;
  if (cachedData && cachedVersion === version) return cachedData;
  const raw = await env.KV.get("clusters:data");
  if (!raw) return null;
  cachedData = JSON.parse(raw) as ClusterData;
  cachedVersion = version;
  return cachedData;
}

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let j = 0; j < a.length; j++) {
    const d = a[j] - b[j];
    s += d * d;
  }
  return Math.sqrt(s);
}

function topKCentroids(vec: number[], centroids: number[][], k: number): { idx: number; dist: number }[] {
  const scored = centroids.map((c, idx) => ({ idx, dist: euclidean(vec, c) }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, k);
}

function normalize(vec: number[]): number[] {
  let n = 0;
  for (const v of vec) n += v * v;
  const norm = Math.sqrt(n);
  if (norm < 1e-10) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Assign an item to its top-K nearest clusters based on a representative vector.
 * Writes rows to cluster_membership. No-op if clusters haven't been computed yet.
 * Safe to call from `waitUntil` — failures are logged, not thrown.
 */
export async function assignClusters(
  env: Env,
  kind: "thought" | "paste" | "amplification",
  id: string | number,
  title: string | null,
  preview: string | null,
  vec: number[],
): Promise<void> {
  try {
    const data = await getClusterData(env);
    if (!data) return;
    const normalized = normalize(vec);
    const tops = topKCentroids(normalized, data.centroids, Math.min(TOP_K, data.centroids.length));
    const idStr = String(id);
    const truncated = preview ? preview.slice(0, 200) : null;

    const stmts = [
      env.DB.prepare("DELETE FROM cluster_membership WHERE item_kind = ? AND item_id = ?").bind(kind, idStr),
      ...tops.map((t, rank) =>
        env.DB.prepare(
          "INSERT INTO cluster_membership (item_kind, item_id, cluster_id, rank, distance, title, preview) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(kind, idStr, t.idx + 1, rank, t.dist, title, truncated),
      ),
    ];
    await env.DB.batch(stmts);
  } catch (e) {
    console.error("assignClusters failed:", e);
  }
}

/** Best-effort cleanup when an item is deleted. */
export async function removeClusterMembership(
  env: Env,
  kind: "thought" | "paste" | "amplification",
  id: string | number,
): Promise<void> {
  try {
    await env.DB.prepare("DELETE FROM cluster_membership WHERE item_kind = ? AND item_id = ?").bind(kind, String(id)).run();
  } catch (e) {
    console.error("removeClusterMembership failed:", e);
  }
}

function isAuthed(c: { req: { header: (name: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

/**
 * Schedule async work to run past the response. Falls back to fire-and-forget if
 * the Hono context has no ExecutionContext (test harness).
 */
export function scheduleBackground(
  c: { executionCtx: { waitUntil: (p: Promise<unknown>) => void } },
  promise: Promise<unknown>,
): void {
  try {
    c.executionCtx.waitUntil(promise);
  } catch {
    promise.catch((e) => console.error("scheduleBackground caught:", e));
  }
}

clusters.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, label, size FROM cluster ORDER BY size DESC"
  ).all();
  return c.json({ clusters: rows.results });
});

clusters.get("/items", async (c) => {
  const idsParam = c.req.query("ids");
  if (!idsParam) return c.json({ error: "Missing ids" }, 400);
  const ids = idsParam.split(",").map((s) => parseInt(s, 10)).filter(Number.isFinite).slice(0, 5);
  if (ids.length === 0) return c.json({ error: "Invalid ids" }, 400);

  const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(c.req.query("offset") ?? "0", 10) || 0;
  const authed = isAuthed(c);

  const placeholders = ids.map(() => "?").join(",");
  const privateFilter = authed
    ? ""
    : "AND NOT (item_kind = 'thought' AND CAST(item_id AS INTEGER) IN (SELECT id FROM thought WHERE private = 1))";

  const results = await c.env.DB.prepare(
    `SELECT item_kind, item_id, title, preview, AVG(distance) AS avg_dist
     FROM cluster_membership
     WHERE cluster_id IN (${placeholders}) ${privateFilter}
     GROUP BY item_kind, item_id
     HAVING COUNT(*) = ?
     ORDER BY avg_dist ASC
     LIMIT ? OFFSET ?`
  ).bind(...ids, ids.length, limit, offset).all<{
    item_kind: string;
    item_id: string;
    title: string | null;
    preview: string | null;
    avg_dist: number;
  }>();

  // Attach derived-type facets to thought rows (books/movies/events via thought_id).
  const thoughtIds = results.results
    .filter((r) => r.item_kind === "thought")
    .map((r) => parseInt(r.item_id, 10))
    .filter(Number.isFinite);

  const facets = new Map<number, { books: { id: number; title: string }[]; movies: { id: number; title: string }[]; events: { id: number; title: string; date_text: string }[] }>();
  for (const tid of thoughtIds) facets.set(tid, { books: [], movies: [], events: [] });

  if (thoughtIds.length > 0) {
    const ph = thoughtIds.map(() => "?").join(",");
    const [books, events, movies] = await Promise.all([
      c.env.DB.prepare(`SELECT thought_id, id, title FROM book WHERE thought_id IN (${ph})`).bind(...thoughtIds).all<{ thought_id: number; id: number; title: string }>(),
      c.env.DB.prepare(`SELECT thought_id, id, title, date_text FROM event WHERE thought_id IN (${ph})`).bind(...thoughtIds).all<{ thought_id: number; id: number; title: string; date_text: string }>(),
      c.env.DB.prepare(`SELECT tm.thought_id, m.id, m.title FROM thought_movie tm JOIN movie m ON m.id = tm.movie_id WHERE tm.thought_id IN (${ph})`).bind(...thoughtIds).all<{ thought_id: number; id: number; title: string }>(),
    ]);
    for (const b of books.results) facets.get(b.thought_id)?.books.push({ id: b.id, title: b.title });
    for (const e of events.results) facets.get(e.thought_id)?.events.push({ id: e.id, title: e.title, date_text: e.date_text });
    for (const m of movies.results) facets.get(m.thought_id)?.movies.push({ id: m.id, title: m.title });
  }

  const items = results.results.map((r) => ({
    kind: r.item_kind,
    id: r.item_id,
    title: r.title,
    preview: r.preview,
    score: r.avg_dist,
    facets: r.item_kind === "thought" ? facets.get(parseInt(r.item_id, 10)) ?? null : null,
  }));

  return c.json({ items, meta: { limit, offset, selected: ids.length } });
});
