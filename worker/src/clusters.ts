import type { Env } from "./index";

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
