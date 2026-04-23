export function normalizeBody(body: string): string {
  return body.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function hashBody(body: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeBody(body));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Given a set of thoughts with `id` and `body_hash`, attach a `duplicate_ids`
 * array to each — ids of other thoughts sharing the same body_hash. When
 * `authed` is false, private duplicates are excluded.
 *
 * Mutates `thoughts` in place.
 */
export async function attachDuplicateIds(
  db: D1Database,
  thoughts: Array<Record<string, unknown>>,
  authed: boolean,
): Promise<void> {
  const hashes = new Set<string>();
  for (const t of thoughts) {
    const h = t.body_hash as string | null | undefined;
    if (h) hashes.add(h);
  }
  if (hashes.size === 0) {
    for (const t of thoughts) t.duplicate_ids = [];
    return;
  }
  const hashList = [...hashes];
  const placeholders = hashList.map(() => "?").join(",");
  const privateFilter = authed ? "" : " AND private = 0";
  const rows = await db.prepare(
    `SELECT id, body_hash FROM thought WHERE body_hash IN (${placeholders})${privateFilter}`
  ).bind(...hashList).all<{ id: number; body_hash: string }>();

  const byHash = new Map<string, number[]>();
  for (const r of rows.results) {
    const list = byHash.get(r.body_hash) ?? [];
    list.push(r.id);
    byHash.set(r.body_hash, list);
  }

  for (const t of thoughts) {
    const h = t.body_hash as string | null | undefined;
    const selfId = t.id as number;
    const all = h ? byHash.get(h) ?? [] : [];
    t.duplicate_ids = all.filter((id) => id !== selfId);
  }
}
