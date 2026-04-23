import { Hono } from "hono";
import type { Env } from "./index";
import { CreateAmplificationBody } from "./schemas";
import { fetchOgMetadata } from "./opengraph";
import type { OgMetadata } from "./opengraph";
import { isSubstackNoteUrl, fetchSubstackNoteMetadata } from "./substack";

async function enrichUrl(url: string, source: string): Promise<OgMetadata | null> {
  if (source === "substack" && isSubstackNoteUrl(url)) {
    const fromApi = await fetchSubstackNoteMetadata(url);
    if (fromApi) return fromApi;
  }
  return fetchOgMetadata(url);
}

export const amplifications = new Hono<{ Bindings: Env }>();

function classifySource(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com")) {
      return "twitter";
    }
    if (host === "substack.com" || host.endsWith(".substack.com")) {
      return "substack";
    }
    if (host === "bsky.app" || host.endsWith(".bsky.app") || host.endsWith(".bsky.social")) {
      return "bluesky";
    }
    if (host === "mastodon.social" || host.endsWith(".mastodon.social")) {
      return "mastodon";
    }
    return "other";
  } catch {
    return "other";
  }
}

amplifications.get("/", async (c) => {
  const source = c.req.query("source");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offset = parseInt(c.req.query("offset") || "0", 10) || 0;

  let query = "SELECT id, url, source, note, title, image_url, description, site_name, created_at FROM amplification";
  const bindings: (string | number)[] = [];
  if (source) {
    query += " WHERE source = ?";
    bindings.push(source);
  }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ amplifications: results.results, meta: { limit, offset, hasMore: results.results.length === limit } });
});

amplifications.post("/", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = CreateAmplificationBody.parse(await c.req.json());
  const source = body.source ?? classifySource(body.url);
  const now = Math.floor(Date.now() / 1000);

  const existing = await c.env.DB.prepare(
    "SELECT id FROM amplification WHERE url = ?"
  ).bind(body.url).first<{ id: number }>();

  if (existing) {
    if (body.note !== undefined) {
      await c.env.DB.prepare("UPDATE amplification SET note = ? WHERE id = ?").bind(body.note, existing.id).run();
    }
    const row = await c.env.DB.prepare(
      "SELECT id, url, source, note, title, image_url, description, site_name, created_at FROM amplification WHERE id = ?"
    ).bind(existing.id).first();
    return c.json({ ...row, duplicate: true });
  }

  const og = await enrichUrl(body.url, source);

  const result = await c.env.DB.prepare(
    "INSERT INTO amplification (url, source, note, title, image_url, description, site_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    body.url,
    source,
    body.note ?? null,
    og?.title ?? null,
    og?.imageUrl ?? null,
    og?.description ?? null,
    og?.siteName ?? null,
    now,
  ).run();

  const row = await c.env.DB.prepare(
    "SELECT id, url, source, note, title, image_url, description, site_name, created_at FROM amplification WHERE id = ?"
  ).bind(result.meta.last_row_id).first();

  return c.json(row, 201);
});

amplifications.patch("/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"), 10);
  const row = await c.env.DB.prepare("SELECT url, source FROM amplification WHERE id = ?").bind(id).first<{ url: string; source: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);

  const og = await enrichUrl(row.url, row.source);
  if (!og) return c.json({ error: "Could not fetch metadata" }, 422);

  await c.env.DB.prepare(
    "UPDATE amplification SET title = ?, image_url = ?, description = ?, site_name = ? WHERE id = ?"
  ).bind(og.title, og.imageUrl, og.description, og.siteName, id).run();

  const updated = await c.env.DB.prepare(
    "SELECT id, url, source, note, title, image_url, description, site_name, created_at FROM amplification WHERE id = ?"
  ).bind(id).first();
  return c.json(updated);
});

amplifications.delete("/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = parseInt(c.req.param("id"), 10);
  await c.env.DB.prepare("DELETE FROM amplification WHERE id = ?").bind(id).run();
  return c.json({ deleted: true });
});
