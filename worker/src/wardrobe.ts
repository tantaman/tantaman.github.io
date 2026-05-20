import { Hono } from "hono";
import type { Env } from "./index";
import { fetchOgMetadata } from "./opengraph";

export const wardrobe = new Hono<{ Bindings: Env }>();

const USER_ID = "me";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_STATUSES = new Set([
  "candidate",
  "shortlist",
  "keep",
  "own",
  "cut",
]);

function isAuthed(c: { req: { header: (name: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

interface ItemRow {
  id: number;
  name: string | null;
  brand: string | null;
  notes: string;
  facets: string;
  links: string;
  price_cents: number | null;
  status: string;
  rating: number | null;
  created_at: number;
  updated_at: number;
}

interface PhotoRow {
  item_id: number;
  attachment_key: string;
  attachment_type: string;
  attachment_name: string;
  position: number;
}

function rowToItem(row: ItemRow, photos: PhotoRow[]) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    notes: row.notes,
    facets: safeJson<Record<string, string>>(row.facets, {}),
    links: safeJson<LinkInput[]>(row.links, []),
    price_cents: row.price_cents,
    status: row.status,
    rating: row.rating,
    created_at: row.created_at,
    updated_at: row.updated_at,
    photos: photos
      .filter((p) => p.item_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ key: p.attachment_key, type: p.attachment_type, name: p.attachment_name })),
  };
}

function safeJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

function sanitizeFacets(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0 && v.length < 100 && /^[a-zA-Z0-9_\-]+$/.test(k)) {
      out[k] = v.slice(0, 100);
    }
  }
  return out;
}

interface LinkInput {
  url: string;
  title?: string;
  image?: string;
  price_cents?: number;
}

function sanitizeLinks(input: unknown): LinkInput[] {
  if (!Array.isArray(input)) return [];
  const out: LinkInput[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.url !== "string" || !obj.url) continue;
    const link: LinkInput = { url: obj.url.slice(0, 1000) };
    if (typeof obj.title === "string") link.title = obj.title.slice(0, 300);
    if (typeof obj.image === "string") link.image = obj.image.slice(0, 1000);
    if (typeof obj.price_cents === "number" && Number.isFinite(obj.price_cents)) {
      link.price_cents = Math.round(obj.price_cents);
    }
    out.push(link);
    if (out.length >= 10) break;
  }
  return out;
}

async function fetchItems(db: D1Database, ids: number[]) {
  if (ids.length === 0) return { items: [], photos: [] };
  const placeholders = ids.map(() => "?").join(",");
  const photosQ = await db
    .prepare(`SELECT item_id, attachment_key, attachment_type, attachment_name, position FROM wardrobe_photo WHERE item_id IN (${placeholders}) ORDER BY position ASC`)
    .bind(...ids)
    .all<PhotoRow>();
  return { photos: photosQ.results };
}

// OG metadata for a single URL. Used when adding a product link so we can
// auto-fill title/image/price without the user transcribing.
wardrobe.get("/og", async (c) => {
  const url = c.req.query("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return c.json({ error: "Provide a valid http(s) URL" }, 400);
  }
  const og = await fetchOgMetadata(url);
  if (!og) return c.json({ error: "No metadata found" }, 404);
  return c.json({
    url,
    title: og.title,
    image: og.imageUrl,
    description: og.description,
    site_name: og.siteName,
    price_cents: og.priceCents ?? null,
    price_currency: og.priceCurrency ?? null,
  });
});

// Proxy fetch for an OG image so the browser can pull the bytes (via fetch)
// without CORS getting in the way during quick-import. The browser then
// turns this into a File and uploads it with the rest of the item's photos.
wardrobe.get("/og-image", async (c) => {
  const url = c.req.query("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return c.json({ error: "Provide a valid http(s) URL" }, 400);
  }
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Twitterbot/1.0",
        Accept: "image/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return c.json({ error: "Fetch failed" }, 502);
  }
  if (!res.ok || !res.body) return c.json({ error: `Fetch failed (${res.status})` }, 502);

  const contentType = res.headers.get("Content-Type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return c.json({ error: "Not an image" }, 415);
  }
  // Cap at MAX_FILE_SIZE so we can't be used as an unbounded proxy.
  const lenHeader = res.headers.get("Content-Length");
  if (lenHeader) {
    const len = parseInt(lenHeader, 10);
    if (Number.isFinite(len) && len > MAX_FILE_SIZE) {
      return c.json({ error: "Image too large" }, 413);
    }
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
});

// Export — markdown by default, JSON when ?format=json. Designed to be
// pasted into an LLM context so it can suggest more pieces along similar
// lines. Filters by status (defaults to retained items: keep, own, shortlist).
wardrobe.get("/export", async (c) => {
  const format = c.req.query("format") ?? "md";
  const statusParam = c.req.query("status");
  const requested = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter((s) => ALLOWED_STATUSES.has(s))
    : ["own", "keep", "shortlist", "candidate", "cut"];

  const placeholders = requested.map(() => "?").join(",");
  const itemsQ = await c.env.DB
    .prepare(`SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE user_id = ? AND status IN (${placeholders}) ORDER BY status ASC, json_extract(facets, '$.category') ASC, updated_at DESC`)
    .bind(USER_ID, ...requested)
    .all<ItemRow>();
  const items = itemsQ.results;
  const { photos } = await fetchItems(c.env.DB, items.map((i) => i.id));

  // Resolve schema for prettier facet labels in the markdown.
  const schemaRow = await c.env.DB
    .prepare("SELECT schema FROM wardrobe_facet_schema WHERE user_id = ?")
    .bind(USER_ID)
    .first<{ schema: string }>();
  const schema = schemaRow ? safeJson<Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>>(schemaRow.schema, []) : [];
  const facetLabel = new Map(schema.map((f) => [f.key, f.label]));
  const facetOptionLabels = new Map<string, Map<string, string>>();
  for (const f of schema) {
    facetOptionLabels.set(f.key, new Map(f.options.map((o) => [o.value, o.label])));
  }

  const built = items.map((row) => rowToItem(row, photos));

  if (format === "json") {
    return c.json({
      generated_at: new Date().toISOString(),
      statuses: requested,
      count: built.length,
      items: built.map((i) => ({
        ...i,
        photo_urls: i.photos.map((p) => `https://tantaman.com/api/attachments/${p.key}`),
      })),
    });
  }

  // Markdown render
  const fmtPrice = (cents: number | null | undefined) =>
    cents == null ? null : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  const stars = (r: number | null) => (r == null ? "—" : "★".repeat(r) + "☆".repeat(5 - r));

  const lines: string[] = [];
  lines.push(`# Wardrobe Archive`);
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString().slice(0, 10)} · ${built.length} ${built.length === 1 ? "piece" : "pieces"} · statuses: ${requested.join(", ")}_`);
  lines.push("");
  lines.push(`This is a curated wardrobe under active selection. Each entry lists what's known so far — brand, source links, facet tags, notes, and direct image URLs. Use it as context when proposing similar pieces, alternative brands at adjacent price points, or things that would complete the set.`);
  lines.push("");

  // Group by status for readability
  const byStatus = new Map<string, ReturnType<typeof rowToItem>[]>();
  for (const it of built) {
    if (!byStatus.has(it.status)) byStatus.set(it.status, []);
    byStatus.get(it.status)!.push(it);
  }
  const STATUS_LABEL: Record<string, string> = {
    own: "Owned",
    keep: "Keep",
    shortlist: "Shortlist",
    candidate: "Candidates",
    cut: "Cut",
  };

  for (const status of requested) {
    const group = byStatus.get(status);
    if (!group || group.length === 0) continue;
    lines.push(`---`);
    lines.push("");
    lines.push(`## ${STATUS_LABEL[status] ?? status} (${group.length})`);
    lines.push("");

    for (const item of group) {
      const catnum = `№ ${String(item.id).padStart(3, "0")}`;
      const heading = item.name || item.brand || "Untitled";
      lines.push(`### ${catnum} · ${heading}`);
      lines.push("");

      const meta: string[] = [];
      if (item.brand) meta.push(`**Brand:** ${item.brand}`);
      const price = fmtPrice(item.price_cents);
      if (price) meta.push(`**Price:** ${price}`);
      meta.push(`**Status:** ${(STATUS_LABEL[item.status] ?? item.status).toUpperCase()}`);
      if (item.rating != null) meta.push(`**Rating:** ${stars(item.rating)}`);
      if (meta.length > 0) {
        lines.push(meta.join("  \n"));
        lines.push("");
      }

      const facetEntries = Object.entries(item.facets).filter(([, v]) => v);
      if (facetEntries.length > 0) {
        const parts = facetEntries.map(([k, v]) => {
          const lk = facetLabel.get(k) ?? k;
          const lv = facetOptionLabels.get(k)?.get(v) ?? v;
          return `**${lk}:** ${lv}`;
        });
        lines.push(parts.join(" · "));
        lines.push("");
      }

      if (item.notes && item.notes.trim()) {
        lines.push(item.notes.trim());
        lines.push("");
      }

      if (item.links && item.links.length > 0) {
        lines.push(`**Sources:**`);
        for (const l of item.links) {
          const linkPrice = fmtPrice(l.price_cents);
          const title = l.title ? l.title : new URL(l.url).hostname.replace(/^www\./, "");
          lines.push(`- [${title}](${l.url})${linkPrice ? ` — ${linkPrice}` : ""}`);
        }
        lines.push("");
      }

      if (item.photos.length > 0) {
        lines.push(`**Photos:**`);
        for (const p of item.photos) {
          lines.push(`- https://tantaman.com/api/attachments/${p.key}`);
        }
        lines.push("");
      }
    }
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
});

// List items
wardrobe.get("/items", async (c) => {
  const status = c.req.query("status");
  const conds: string[] = ["user_id = ?"];
  const binds: (string | number)[] = [USER_ID];
  if (status && ALLOWED_STATUSES.has(status)) {
    conds.push("status = ?");
    binds.push(status);
  }
  // Apply facet filters: ?facet.category=shirt
  const facetWhere: string[] = [];
  for (const [k, v] of Object.entries(c.req.query())) {
    if (!k.startsWith("facet.")) continue;
    const fk = k.slice("facet.".length);
    if (!/^[a-zA-Z0-9_\-]+$/.test(fk)) continue;
    if (!v) continue;
    facetWhere.push("json_extract(facets, ?) = ?");
    binds.push(`$.${fk}`, v);
  }
  conds.push(...facetWhere);

  const limit = Math.min(parseInt(c.req.query("limit") || "500", 10) || 500, 1000);
  const offset = parseInt(c.req.query("offset") || "0", 10) || 0;
  binds.push(limit, offset);

  const itemsQ = await c.env.DB
    .prepare(`SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE ${conds.join(" AND ")} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds)
    .all<ItemRow>();

  const items = itemsQ.results;
  const { photos } = await fetchItems(c.env.DB, items.map((i) => i.id));

  return c.json({
    items: items.map((row) => rowToItem(row, photos)),
    meta: { hasMore: items.length === limit },
  });
});

// Get one
wardrobe.get("/items/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);
  const row = await c.env.DB
    .prepare("SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE id = ? AND user_id = ?")
    .bind(id, USER_ID)
    .first<ItemRow>();
  if (!row) return c.json({ error: "Not found" }, 404);
  const { photos } = await fetchItems(c.env.DB, [id]);
  return c.json(rowToItem(row, photos));
});

// Create — multipart with `payload` JSON field + multiple `file` parts.
wardrobe.post("/items", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const contentType = c.req.header("Content-Type") || "";

  let payload: Record<string, unknown> = {};
  let files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.formData();
    const raw = form.get("payload");
    if (typeof raw === "string") {
      try { payload = JSON.parse(raw); } catch {}
    }
    const formFiles = (form.getAll("file") as unknown as (string | File)[]).filter((f): f is File => typeof f !== "string");
    for (const f of formFiles) {
      if (f.size === 0) continue;
      if (f.size > MAX_FILE_SIZE) return c.json({ error: `File too large: ${f.name}` }, 413);
      files.push(f);
    }
  } else {
    try { payload = await c.req.json(); } catch {}
  }

  const name = typeof payload.name === "string" ? payload.name.slice(0, 200) : null;
  const brand = typeof payload.brand === "string" ? payload.brand.slice(0, 200) : null;
  const notes = typeof payload.notes === "string" ? payload.notes.slice(0, 5000) : "";
  const facets = sanitizeFacets(payload.facets);
  const links = sanitizeLinks(payload.links);
  const status = typeof payload.status === "string" && ALLOWED_STATUSES.has(payload.status)
    ? payload.status
    : "candidate";
  const rating = typeof payload.rating === "number" ? Math.max(1, Math.min(5, Math.round(payload.rating))) : null;
  const price_cents = typeof payload.price_cents === "number" && Number.isFinite(payload.price_cents)
    ? Math.round(payload.price_cents)
    : null;

  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB
    .prepare(`INSERT INTO wardrobe_item (user_id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(USER_ID, name, brand, notes, JSON.stringify(facets), JSON.stringify(links), price_cents, status, rating, now, now)
    .run();

  const itemId = result.meta.last_row_id as number;

  // Persist photos
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `wardrobe/${itemId}/${Date.now()}-${i}-${safeName}`;
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "image/jpeg" },
    });
    await c.env.DB
      .prepare("INSERT INTO wardrobe_photo (item_id, attachment_key, attachment_type, attachment_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(itemId, key, file.type || "image/jpeg", file.name, i, now)
      .run();
  }

  const row = await c.env.DB
    .prepare("SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE id = ?")
    .bind(itemId)
    .first<ItemRow>();
  const { photos } = await fetchItems(c.env.DB, [itemId]);

  return c.json(rowToItem(row!, photos), 201);
});

// Patch
wardrobe.patch("/items/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);

  const existing = await c.env.DB
    .prepare("SELECT id FROM wardrobe_item WHERE id = ? AND user_id = ?")
    .bind(id, USER_ID)
    .first();
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  const updates: string[] = [];
  const binds: (string | number | null)[] = [];

  if ("name" in body) {
    updates.push("name = ?");
    binds.push(body.name == null ? null : String(body.name).slice(0, 200));
  }
  if ("brand" in body) {
    updates.push("brand = ?");
    binds.push(body.brand == null ? null : String(body.brand).slice(0, 200));
  }
  if ("notes" in body) {
    updates.push("notes = ?");
    binds.push(String(body.notes ?? "").slice(0, 5000));
  }
  if ("facets" in body) {
    updates.push("facets = ?");
    binds.push(JSON.stringify(sanitizeFacets(body.facets)));
  }
  if ("links" in body) {
    updates.push("links = ?");
    binds.push(JSON.stringify(sanitizeLinks(body.links)));
  }
  if ("price_cents" in body) {
    updates.push("price_cents = ?");
    binds.push(typeof body.price_cents === "number" ? Math.round(body.price_cents) : null);
  }
  if ("status" in body && typeof body.status === "string" && ALLOWED_STATUSES.has(body.status)) {
    updates.push("status = ?");
    binds.push(body.status);
  }
  if ("rating" in body) {
    const r = body.rating;
    updates.push("rating = ?");
    binds.push(typeof r === "number" ? Math.max(1, Math.min(5, Math.round(r))) : null);
  }

  if (updates.length === 0) {
    // No-op; return current
    const row = await c.env.DB
      .prepare("SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE id = ?")
      .bind(id)
      .first<ItemRow>();
    const { photos } = await fetchItems(c.env.DB, [id]);
    return c.json(rowToItem(row!, photos));
  }

  const now = Math.floor(Date.now() / 1000);
  updates.push("updated_at = ?");
  binds.push(now);
  binds.push(id);

  await c.env.DB
    .prepare(`UPDATE wardrobe_item SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();

  const row = await c.env.DB
    .prepare("SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE id = ?")
    .bind(id)
    .first<ItemRow>();
  const { photos } = await fetchItems(c.env.DB, [id]);
  return c.json(rowToItem(row!, photos));
});

// Add photos
wardrobe.post("/items/:id/photos", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);

  const existing = await c.env.DB
    .prepare("SELECT id FROM wardrobe_item WHERE id = ? AND user_id = ?")
    .bind(id, USER_ID)
    .first();
  if (!existing) return c.json({ error: "Not found" }, 404);

  const form = await c.req.formData();
  const files: File[] = [];
  const formFiles = (form.getAll("file") as unknown as (string | File)[]).filter((f): f is File => typeof f !== "string");
  for (const f of formFiles) {
    if (f.size === 0) continue;
    if (f.size > MAX_FILE_SIZE) return c.json({ error: `File too large: ${f.name}` }, 413);
    files.push(f);
  }

  const last = await c.env.DB
    .prepare("SELECT COALESCE(MAX(position), -1) AS maxpos FROM wardrobe_photo WHERE item_id = ?")
    .bind(id)
    .first<{ maxpos: number }>();
  let pos = (last?.maxpos ?? -1) + 1;
  const now = Math.floor(Date.now() / 1000);

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `wardrobe/${id}/${Date.now()}-${pos}-${safeName}`;
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "image/jpeg" },
    });
    await c.env.DB
      .prepare("INSERT INTO wardrobe_photo (item_id, attachment_key, attachment_type, attachment_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, key, file.type || "image/jpeg", file.name, pos, now)
      .run();
    pos++;
  }

  await c.env.DB
    .prepare("UPDATE wardrobe_item SET updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();

  const row = await c.env.DB
    .prepare("SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE id = ?")
    .bind(id)
    .first<ItemRow>();
  const { photos } = await fetchItems(c.env.DB, [id]);
  return c.json(rowToItem(row!, photos));
});

// Remove a photo
wardrobe.delete("/items/:id/photos/:key{.+}", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  const key = decodeURIComponent(c.req.param("key"));
  if (!Number.isFinite(id) || !key) return c.json({ error: "Bad request" }, 400);

  const photo = await c.env.DB
    .prepare("SELECT attachment_key FROM wardrobe_photo WHERE item_id = ? AND attachment_key = ?")
    .bind(id, key)
    .first<{ attachment_key: string }>();
  if (!photo) return c.json({ error: "Not found" }, 404);

  try { await c.env.BUCKET.delete(key); } catch {}
  await c.env.DB
    .prepare("DELETE FROM wardrobe_photo WHERE item_id = ? AND attachment_key = ?")
    .bind(id, key)
    .run();

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB
    .prepare("UPDATE wardrobe_item SET updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();

  const row = await c.env.DB
    .prepare("SELECT id, name, brand, notes, facets, links, price_cents, status, rating, created_at, updated_at FROM wardrobe_item WHERE id = ?")
    .bind(id)
    .first<ItemRow>();
  const { photos } = await fetchItems(c.env.DB, [id]);
  return c.json(rowToItem(row!, photos));
});

// Hard delete (rare path — usually use status='cut' instead)
wardrobe.delete("/items/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);

  const photos = await c.env.DB
    .prepare("SELECT attachment_key FROM wardrobe_photo WHERE item_id = ?")
    .bind(id)
    .all<{ attachment_key: string }>();
  for (const p of photos.results) {
    try { await c.env.BUCKET.delete(p.attachment_key); } catch {}
  }

  await c.env.DB.prepare("DELETE FROM wardrobe_photo WHERE item_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM wardrobe_item WHERE id = ? AND user_id = ?").bind(id, USER_ID).run();
  return c.json({ ok: true });
});

// Facet schema
wardrobe.get("/facets", async (c) => {
  const row = await c.env.DB
    .prepare("SELECT schema FROM wardrobe_facet_schema WHERE user_id = ?")
    .bind(USER_ID)
    .first<{ schema: string }>();
  const facets = row ? safeJson(row.schema, []) : [];
  return c.json({ facets });
});

wardrobe.put("/facets", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  if (!Array.isArray(body.facets)) return c.json({ error: "facets must be array" }, 400);

  const cleaned = body.facets
    .filter((f: any) => f && typeof f.key === "string" && typeof f.label === "string" && /^[a-zA-Z0-9_\-]+$/.test(f.key))
    .map((f: any) => ({
      key: f.key,
      label: f.label.slice(0, 100),
      options: Array.isArray(f.options)
        ? f.options
            .filter((o: any) => o && typeof o.value === "string" && typeof o.label === "string")
            .map((o: any) => ({ value: o.value.slice(0, 50), label: o.label.slice(0, 100) }))
        : [],
    }));

  const now = Math.floor(Date.now() / 1000);
  await c.env.DB
    .prepare(`INSERT INTO wardrobe_facet_schema (user_id, schema, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET schema = excluded.schema, updated_at = excluded.updated_at`)
    .bind(USER_ID, JSON.stringify(cleaned), now)
    .run();

  return c.json({ facets: cleaned });
});

type FacetSchema = Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;

async function loadFacetSchema(db: D1Database): Promise<FacetSchema> {
  const row = await db
    .prepare("SELECT schema FROM wardrobe_facet_schema WHERE user_id = ?")
    .bind(USER_ID)
    .first<{ schema: string }>();
  return row ? safeJson<FacetSchema>(row.schema, []) : [];
}

// Run Workers AI vision against image bytes and return suggestions that
// match the user's facet schema. Returns null on hard failure (caller
// decides how to surface it); empty suggestions just mean the model
// declined to pick anything.
async function suggestFacetsForImage(
  env: Env,
  schema: FacetSchema,
  bytes: number[],
): Promise<{ suggestions: Record<string, string>; raw: string } | { error: string }> {
  const facetLines = schema
    .map((f) => `- ${f.key}: ${f.options.map((o) => o.value).join(" | ")}`)
    .join("\n");

  const prompt = `You are a fashion archivist cataloguing a clothing item from a photo.

Look at the image and suggest values for each facet below. Choose ONLY from the listed options. If a facet does not apply or you cannot tell from the image, omit the key.

Facets:
${facetLines}

Respond with ONLY a single JSON object mapping facet keys to chosen values — no prose, no markdown, no code fences.
Example: {"category":"shirt","sleeve":"short","color":"navy"}`;

  const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
  const runVision = () => env.AI.run(MODEL as any, {
    image: bytes,
    prompt,
    max_tokens: 200,
  } as any) as Promise<{ response?: string; description?: string }>;

  let raw: string;
  try {
    const result = await runVision();
    raw = result.response ?? result.description ?? "";
  } catch (e) {
    const msg = (e as Error).message ?? "";
    // Cloudflare gates llama vision behind a one-time license acceptance:
    // submit prompt 'agree' to accept, then the model becomes usable.
    if (/submit the prompt 'agree'/i.test(msg)) {
      try {
        await env.AI.run(MODEL as any, { prompt: "agree" } as any);
        const retry = await runVision();
        raw = retry.response ?? retry.description ?? "";
      } catch (e2) {
        return { error: `AI call failed: ${(e2 as Error).message}` };
      }
    } else {
      return { error: `AI call failed: ${msg}` };
    }
  }

  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) return { suggestions: {}, raw };

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(match[0]); } catch {
    return { suggestions: {}, raw };
  }

  const valid: Record<string, string> = {};
  for (const f of schema) {
    const v = parsed[f.key];
    if (typeof v !== "string") continue;
    if (f.options.some((o) => o.value === v)) {
      valid[f.key] = v;
    }
  }
  return { suggestions: valid, raw };
}

// AI facet suggestions — use Workers AI vision to read the first photo and
// propose facet values. Falls back gracefully if the model returns junk.
wardrobe.post("/items/:id/suggest-facets", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);

  const schema = await loadFacetSchema(c.env.DB);
  if (schema.length === 0) return c.json({ error: "No facet schema configured" }, 400);

  const photo = await c.env.DB
    .prepare("SELECT attachment_key FROM wardrobe_photo WHERE item_id = ? ORDER BY position ASC LIMIT 1")
    .bind(id)
    .first<{ attachment_key: string }>();
  if (!photo) return c.json({ error: "Item has no photos" }, 422);

  const obj = await c.env.BUCKET.get(photo.attachment_key);
  if (!obj) return c.json({ error: "Photo missing in R2" }, 422);
  const buffer = await obj.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));

  const result = await suggestFacetsForImage(c.env, schema, bytes);
  if ("error" in result) return c.json({ error: result.error }, 500);
  return c.json(result);
});

// Quick-import variant: suggest facets directly from a public image URL,
// no item required. Used when pasting a product link so the form can
// preview facet values before the user commits.
wardrobe.post("/suggest-facets-from-image", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  let body: { image_url?: unknown };
  try { body = await c.req.json(); } catch { return c.json({ error: "Bad JSON" }, 400); }
  const url = typeof body.image_url === "string" ? body.image_url : "";
  if (!url || !/^https?:\/\//i.test(url)) {
    return c.json({ error: "Provide a valid http(s) image_url" }, 400);
  }

  const schema = await loadFacetSchema(c.env.DB);
  if (schema.length === 0) return c.json({ error: "No facet schema configured" }, 400);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Twitterbot/1.0", Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return c.json({ error: "Image fetch failed" }, 502);
  }
  if (!res.ok) return c.json({ error: `Image fetch failed (${res.status})` }, 502);
  const contentType = res.headers.get("Content-Type") || "image/jpeg";
  if (!contentType.startsWith("image/")) return c.json({ error: "Not an image" }, 415);

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_SIZE) return c.json({ error: "Image too large" }, 413);
  const bytes = Array.from(new Uint8Array(buffer));

  const result = await suggestFacetsForImage(c.env, schema, bytes);
  if ("error" in result) return c.json({ error: result.error }, 500);
  return c.json(result);
});

// Outfits — named combinations of items.
wardrobe.get("/outfits", async (c) => {
  const outfits = await c.env.DB
    .prepare("SELECT id, name, occasion, notes, created_at, updated_at FROM wardrobe_outfit WHERE user_id = ? ORDER BY updated_at DESC")
    .bind(USER_ID)
    .all<{ id: number; name: string; occasion: string | null; notes: string; created_at: number; updated_at: number }>();

  const outfitIds = outfits.results.map((o) => o.id);
  let memberships: { outfit_id: number; item_id: number; position: number }[] = [];
  if (outfitIds.length > 0) {
    const placeholders = outfitIds.map(() => "?").join(",");
    const memQ = await c.env.DB
      .prepare(`SELECT outfit_id, item_id, position FROM wardrobe_outfit_item WHERE outfit_id IN (${placeholders}) ORDER BY position ASC`)
      .bind(...outfitIds)
      .all<{ outfit_id: number; item_id: number; position: number }>();
    memberships = memQ.results;
  }

  const memByOutfit = new Map<number, number[]>();
  for (const m of memberships) {
    if (!memByOutfit.has(m.outfit_id)) memByOutfit.set(m.outfit_id, []);
    memByOutfit.get(m.outfit_id)!.push(m.item_id);
  }

  // Get thumbnail photos for up to 4 items per outfit
  const allItemIds = Array.from(new Set(memberships.map((m) => m.item_id)));
  let thumbs = new Map<number, string>();
  if (allItemIds.length > 0) {
    const placeholders = allItemIds.map(() => "?").join(",");
    const photoQ = await c.env.DB
      .prepare(`SELECT item_id, attachment_key FROM wardrobe_photo WHERE item_id IN (${placeholders}) AND position = 0`)
      .bind(...allItemIds)
      .all<{ item_id: number; attachment_key: string }>();
    for (const p of photoQ.results) thumbs.set(p.item_id, p.attachment_key);
  }

  return c.json({
    outfits: outfits.results.map((o) => {
      const itemIds = memByOutfit.get(o.id) ?? [];
      return {
        ...o,
        item_ids: itemIds,
        thumbnails: itemIds.slice(0, 4).map((id) => ({
          item_id: id,
          photo_key: thumbs.get(id) ?? null,
        })),
      };
    }),
  });
});

wardrobe.get("/outfits/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);

  const row = await c.env.DB
    .prepare("SELECT id, name, occasion, notes, created_at, updated_at FROM wardrobe_outfit WHERE id = ? AND user_id = ?")
    .bind(id, USER_ID)
    .first<{ id: number; name: string; occasion: string | null; notes: string; created_at: number; updated_at: number }>();
  if (!row) return c.json({ error: "Not found" }, 404);

  const members = await c.env.DB
    .prepare(`SELECT i.id, i.name, i.brand, i.notes, i.facets, i.links, i.price_cents, i.status, i.rating, i.created_at, i.updated_at, oi.position
              FROM wardrobe_outfit_item oi JOIN wardrobe_item i ON i.id = oi.item_id
              WHERE oi.outfit_id = ? ORDER BY oi.position ASC`)
    .bind(id)
    .all<ItemRow & { position: number }>();
  const itemRows = members.results;

  const { photos } = await fetchItems(c.env.DB, itemRows.map((i) => i.id));

  return c.json({
    ...row,
    items: itemRows.map((r) => rowToItem(r, photos)),
  });
});

wardrobe.post("/outfits", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : "Untitled outfit";
  const occasion = typeof body.occasion === "string" ? body.occasion.slice(0, 200) : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : "";
  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB
    .prepare("INSERT INTO wardrobe_outfit (user_id, name, occasion, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(USER_ID, name, occasion, notes, now, now)
    .run();
  return c.json({ id: result.meta.last_row_id, name, occasion, notes, created_at: now, updated_at: now, items: [] }, 201);
});

wardrobe.patch("/outfits/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);

  const body = await c.req.json();
  const updates: string[] = [];
  const binds: (string | number | null)[] = [];
  if ("name" in body && typeof body.name === "string") {
    updates.push("name = ?");
    binds.push(body.name.slice(0, 200));
  }
  if ("occasion" in body) {
    updates.push("occasion = ?");
    binds.push(body.occasion == null ? null : String(body.occasion).slice(0, 200));
  }
  if ("notes" in body) {
    updates.push("notes = ?");
    binds.push(String(body.notes ?? "").slice(0, 5000));
  }
  if (updates.length === 0) return c.json({ ok: true });
  const now = Math.floor(Date.now() / 1000);
  updates.push("updated_at = ?");
  binds.push(now);
  binds.push(id);
  await c.env.DB
    .prepare(`UPDATE wardrobe_outfit SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...binds, USER_ID)
    .run();
  return c.json({ ok: true });
});

wardrobe.delete("/outfits/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "Bad id" }, 400);
  await c.env.DB.prepare("DELETE FROM wardrobe_outfit_item WHERE outfit_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM wardrobe_outfit WHERE id = ? AND user_id = ?").bind(id, USER_ID).run();
  return c.json({ ok: true });
});

wardrobe.post("/outfits/:id/items", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const outfitId = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(outfitId)) return c.json({ error: "Bad id" }, 400);
  const body = await c.req.json();
  const itemId = parseInt(body.item_id, 10);
  if (!Number.isFinite(itemId)) return c.json({ error: "Bad item_id" }, 400);

  const last = await c.env.DB
    .prepare("SELECT COALESCE(MAX(position), -1) AS maxpos FROM wardrobe_outfit_item WHERE outfit_id = ?")
    .bind(outfitId)
    .first<{ maxpos: number }>();
  const pos = (last?.maxpos ?? -1) + 1;
  await c.env.DB
    .prepare("INSERT OR IGNORE INTO wardrobe_outfit_item (outfit_id, item_id, position) VALUES (?, ?, ?)")
    .bind(outfitId, itemId, pos)
    .run();
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare("UPDATE wardrobe_outfit SET updated_at = ? WHERE id = ?").bind(now, outfitId).run();
  return c.json({ ok: true });
});

wardrobe.delete("/outfits/:outfitId/items/:itemId", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const outfitId = parseInt(c.req.param("outfitId"), 10);
  const itemId = parseInt(c.req.param("itemId"), 10);
  if (!Number.isFinite(outfitId) || !Number.isFinite(itemId)) return c.json({ error: "Bad ids" }, 400);
  await c.env.DB
    .prepare("DELETE FROM wardrobe_outfit_item WHERE outfit_id = ? AND item_id = ?")
    .bind(outfitId, itemId)
    .run();
  const now = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare("UPDATE wardrobe_outfit SET updated_at = ? WHERE id = ?").bind(now, outfitId).run();
  return c.json({ ok: true });
});

// Targets
wardrobe.get("/targets", async (c) => {
  const rows = await c.env.DB
    .prepare("SELECT category, min_count, max_count FROM wardrobe_target WHERE user_id = ?")
    .bind(USER_ID)
    .all<{ category: string; min_count: number; max_count: number }>();
  return c.json({
    targets: rows.results.map((r) => ({ category: r.category, min: r.min_count, max: r.max_count })),
  });
});

wardrobe.put("/targets", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  if (!Array.isArray(body.targets)) return c.json({ error: "targets must be array" }, 400);

  await c.env.DB.prepare("DELETE FROM wardrobe_target WHERE user_id = ?").bind(USER_ID).run();
  for (const t of body.targets) {
    if (!t || typeof t.category !== "string" || !t.category) continue;
    const min = Math.max(0, Math.round(Number(t.min) || 0));
    const max = Math.max(min, Math.round(Number(t.max) || min));
    await c.env.DB
      .prepare("INSERT INTO wardrobe_target (user_id, category, min_count, max_count) VALUES (?, ?, ?, ?)")
      .bind(USER_ID, t.category.slice(0, 50), min, max)
      .run();
  }

  const rows = await c.env.DB
    .prepare("SELECT category, min_count, max_count FROM wardrobe_target WHERE user_id = ?")
    .bind(USER_ID)
    .all<{ category: string; min_count: number; max_count: number }>();
  return c.json({
    targets: rows.results.map((r) => ({ category: r.category, min: r.min_count, max: r.max_count })),
  });
});
