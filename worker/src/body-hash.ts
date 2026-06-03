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
  const privateFilter = authed ? "" : " AND private = 0";

  // Match duplicates by hash across the whole table in batches, so the `IN (?,…)`
  // never exceeds D1's bound-parameter ceiling — a feed page can carry more
  // distinct hashes than D1 allows in one statement. (This is the counterpart to
  // the feed's pages-first attachment join; since we're matching against the
  // entire table by hash rather than paging, chunking is the right guard here.)
  const byHash = new Map<string, number[]>();
  const CHUNK = 90;
  for (let i = 0; i < hashList.length; i += CHUNK) {
    const batch = hashList.slice(i, i + CHUNK);
    const placeholders = batch.map(() => "?").join(",");
    const rows = await db.prepare(
      `SELECT id, body_hash FROM thought WHERE body_hash IN (${placeholders})${privateFilter}`
    ).bind(...batch).all<{ id: number; body_hash: string }>();
    for (const r of rows.results) {
      const list = byHash.get(r.body_hash) ?? [];
      list.push(r.id);
      byHash.set(r.body_hash, list);
    }
  }

  for (const t of thoughts) {
    const h = t.body_hash as string | null | undefined;
    const selfId = t.id as number;
    const all = h ? byHash.get(h) ?? [] : [];
    t.duplicate_ids = all.filter((id) => id !== selfId);
  }
}
