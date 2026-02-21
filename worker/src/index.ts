import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { extractEvents } from "./events";
import { extractTasks } from "./tasks";
import { extractTags } from "./tags";
import { createMcpServer } from "./mcp";
import { embedText, upsertThoughtEmbedding, deleteThoughtEmbeddings } from "./embeddings";

export interface Env {
  AI: Ai;
  EMBEDDINGS: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  VECTORIZE: Vectorize;
  THOUGHT_SECRET: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function getVersion(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT counter FROM version WHERE id = 1").first<{ counter: number }>();
  return row?.counter ?? 0;
}

async function bumpVersion(db: D1Database): Promise<void> {
  await db.prepare("UPDATE version SET counter = counter + 1 WHERE id = 1").run();
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ETag / 304 Not Modified for GET requests
app.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    return next();
  }

  // Skip non-API routes (attachments have their own cache headers, MCP is not cacheable)
  const path = c.req.path;
  if (path.startsWith("/attachments/") || path.startsWith("/comments") || path === "/mcp" || path === "/") {
    return next();
  }

  const version = await getVersion(c.env.DB);
  const etag = `"${version}"`;
  const ifNoneMatch = c.req.header("If-None-Match");

  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }

  await next();

  c.res.headers.set("ETag", etag);
  c.res.headers.set("Cache-Control", "private, no-cache");
});

app.all("/mcp", async (c) => {
  const server = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport();

  await server.connect(transport);
  return transport.handleRequest(c);
});

app.get("/", (c) => {
  return c.json({
    name: "tantaman-api",
    description: "API for tantaman.com blog, including MCP server for AI-assisted search",
    mcp: "/mcp",
  });
});

app.get("/thoughts/search", async (c) => {
  const query = c.req.query("q");
  if (!query) {
    return c.json({ error: "Missing q parameter" }, 400);
  }

  const queryVec = await embedText(c.env.AI, query);
  const vecResults = await c.env.VECTORIZE.query(queryVec, {
    topK: 20,
    returnMetadata: "all",
  });

  if (vecResults.matches.length === 0) {
    return c.json({ thoughts: [] });
  }

  const ids = vecResults.matches.map((m) => parseInt(m.id, 10));
  const scoreById = new Map(
    vecResults.matches.map((m) => [parseInt(m.id, 10), m.score])
  );

  const placeholders = ids.map(() => "?").join(",");
  const results = await c.env.DB.prepare(
    `SELECT t.id, t.body, t.timestamp, t.created_at, t.parent_id,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id) AS reply_count
     FROM thought t
     WHERE t.id IN (${placeholders})`
  ).bind(...ids).all();

  const thoughts = results.results as Record<string, unknown>[];

  if (thoughts.length > 0) {
    const tIds = thoughts.map((t) => t.id);
    const aPlaceholders = tIds.map(() => "?").join(",");
    const attachments = await c.env.DB.prepare(
      `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id IN (${aPlaceholders})`
    ).bind(...tIds).all();

    const byThought = new Map<number, { key: string; type: string; name: string }[]>();
    for (const a of attachments.results) {
      const tid = a.thought_id as number;
      if (!byThought.has(tid)) byThought.set(tid, []);
      byThought.get(tid)!.push({
        key: a.attachment_key as string,
        type: a.attachment_type as string,
        name: a.attachment_name as string,
      });
    }

    for (const t of thoughts) {
      t.attachments = byThought.get(t.id as number) || [];
      t.score = scoreById.get(t.id as number) || 0;
    }
  }

  thoughts.sort((a, b) => (b.score as number) - (a.score as number));

  return c.json({ thoughts });
});

app.get("/thoughts", async (c) => {
  const limitParam = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offsetParam = parseInt(c.req.query("offset") || "0", 10) || 0;
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];

  let results;
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    results = await c.env.DB.prepare(
      `SELECT t.id, t.body, t.timestamp, t.created_at,
         (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id) AS reply_count
       FROM thought t
       WHERE t.parent_id IS NULL
       AND t.id IN (
         SELECT tt.thought_id FROM thought_tag tt
         JOIN tag tg ON tg.id = tt.tag_id
         WHERE tg.name IN (${placeholders})
         GROUP BY tt.thought_id
         HAVING COUNT(DISTINCT tg.name) = ?
       )
       ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`
    ).bind(...tags, tags.length, limitParam, offsetParam).all();
  } else {
    results = await c.env.DB.prepare(
      `SELECT t.id, t.body, t.timestamp, t.created_at,
         (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id) AS reply_count
       FROM thought t
       WHERE t.parent_id IS NULL
       ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`
    ).bind(limitParam, offsetParam).all();
  }

  const hasMore = results.results.length === limitParam;

  const thoughts = results.results as Record<string, unknown>[];
  if (thoughts.length > 0) {
    const ids = thoughts.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(",");
    const attachments = await c.env.DB.prepare(
      `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id IN (${placeholders})`
    ).bind(...ids).all();

    const byThought = new Map<number, { key: string; type: string; name: string }[]>();
    for (const a of attachments.results) {
      const tid = a.thought_id as number;
      if (!byThought.has(tid)) byThought.set(tid, []);
      byThought.get(tid)!.push({
        key: a.attachment_key as string,
        type: a.attachment_type as string,
        name: a.attachment_name as string,
      });
    }

    for (const t of thoughts) {
      t.attachments = byThought.get(t.id as number) || [];
    }
  }

  return c.json({
    thoughts,
    meta: { limit: limitParam, offset: offsetParam, hasMore },
  });
});

app.get("/thoughts/tags", async (c) => {
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];

  let results;
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    results = await c.env.DB.prepare(
      `SELECT tg.name, COUNT(DISTINCT tt.thought_id) AS count
       FROM tag tg
       JOIN thought_tag tt ON tt.tag_id = tg.id
       JOIN thought th ON th.id = tt.thought_id AND th.parent_id IS NULL
       WHERE tt.thought_id IN (
         SELECT tt2.thought_id FROM thought_tag tt2
         JOIN tag tg2 ON tg2.id = tt2.tag_id
         WHERE tg2.name IN (${placeholders})
         GROUP BY tt2.thought_id
         HAVING COUNT(DISTINCT tg2.name) = ?
       )
       GROUP BY tg.id
       ORDER BY count DESC`
    ).bind(...tags, tags.length).all();
  } else {
    results = await c.env.DB.prepare(
      `SELECT t.name, COUNT(tt.thought_id) AS count
       FROM tag t
       JOIN thought_tag tt ON tt.tag_id = t.id
       JOIN thought th ON th.id = tt.thought_id AND th.parent_id IS NULL
       GROUP BY t.id
       ORDER BY count DESC`
    ).all();
  }

  return c.json({ tags: results.results });
});

app.get("/thoughts/:id/replies", async (c) => {
  const parentId = c.req.param("id");

  // Fetch parent thought
  const parentRow = await c.env.DB.prepare(
    `SELECT t.id, t.parent_id, t.body, t.timestamp, t.created_at,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id) AS reply_count
     FROM thought t
     WHERE t.id = ?`
  ).bind(parentId).first();

  if (!parentRow) {
    return c.json({ error: "Thought not found" }, 404);
  }

  const parent = parentRow as Record<string, unknown>;

  // Fetch parent attachments
  const parentAttachments = await c.env.DB.prepare(
    `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id = ?`
  ).bind(parentId).all();
  parent.attachments = parentAttachments.results.map((a) => ({
    key: a.attachment_key as string,
    type: a.attachment_type as string,
    name: a.attachment_name as string,
  }));

  // Fetch all descendants recursively
  const results = await c.env.DB.prepare(
    `WITH RECURSIVE descendants(id, parent_id, body, timestamp, created_at, depth) AS (
       SELECT id, parent_id, body, timestamp, created_at, 0
       FROM thought WHERE parent_id = ?
       UNION ALL
       SELECT t.id, t.parent_id, t.body, t.timestamp, t.created_at, d.depth + 1
       FROM thought t JOIN descendants d ON t.parent_id = d.id
     )
     SELECT d.id, d.parent_id, d.body, d.timestamp, d.created_at, d.depth,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = d.id) AS reply_count
     FROM descendants d
     ORDER BY d.depth ASC, d.timestamp ASC`
  ).bind(parentId).all();

  const replies = results.results as Record<string, unknown>[];
  if (replies.length > 0) {
    const ids = replies.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(",");
    const attachments = await c.env.DB.prepare(
      `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id IN (${placeholders})`
    ).bind(...ids).all();

    const byThought = new Map<number, { key: string; type: string; name: string }[]>();
    for (const a of attachments.results) {
      const tid = a.thought_id as number;
      if (!byThought.has(tid)) byThought.set(tid, []);
      byThought.get(tid)!.push({
        key: a.attachment_key as string,
        type: a.attachment_type as string,
        name: a.attachment_name as string,
      });
    }

    for (const t of replies) {
      t.attachments = byThought.get(t.id as number) || [];
    }
  }

  return c.json({ parent, replies });
});

app.post("/thoughts", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let trimmed: string;
  let files: File[] = [];
  let parentId: number | null = null;

  const contentType = c.req.header("Content-Type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    trimmed = ((formData.get("body") as string) || "").trim();
    files = (formData.getAll("file") as unknown as (string | File)[]).filter((f): f is File => typeof f !== "string");
    const parentIdStr = formData.get("parent_id") as string | null;
    if (parentIdStr) parentId = parseInt(parentIdStr, 10);
  } else {
    const json = await c.req.json<{ body: string; parent_id?: number }>();
    trimmed = (json.body || "").trim();
    if (json.parent_id != null) parentId = json.parent_id;
  }

  if (!trimmed || trimmed.length > 1000) {
    return c.json({ error: "Body must be non-empty and at most 1000 characters" }, 400);
  }

  if (parentId != null) {
    const parent = await c.env.DB.prepare(
      "SELECT id FROM thought WHERE id = ?"
    ).bind(parentId).first();
    if (!parent) {
      return c.json({ error: "Parent thought not found" }, 404);
    }
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File "${file.name}" exceeds 5MB limit` }, 400);
    }
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const result = await c.env.DB.prepare(
    "INSERT INTO thought (body, timestamp, parent_id) VALUES (?, ?, ?)"
  ).bind(trimmed, timestamp, parentId).run();

  const thoughtId = result.meta.last_row_id;

  const tags = extractTags(trimmed);
  for (const tagName of tags) {
    await c.env.DB.prepare("INSERT OR IGNORE INTO tag (name) VALUES (?)").bind(tagName).run();
    const tagRow = await c.env.DB.prepare("SELECT id FROM tag WHERE name = ?").bind(tagName).first();
    await c.env.DB.prepare("INSERT OR IGNORE INTO thought_tag (thought_id, tag_id) VALUES (?, ?)").bind(thoughtId, tagRow!.id).run();
  }

  const tasks = extractTasks(trimmed);
  for (const task of tasks) {
    await c.env.DB.prepare(
      "INSERT INTO task (thought_id, title, description, created_at) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, task.title, task.description, timestamp).run();
  }

  const events = extractEvents(trimmed, timestamp);
  for (const event of events) {
    await c.env.DB.prepare(
      "INSERT INTO event (thought_id, title, description, date_text, date_epoch, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(thoughtId, event.title, event.description, event.dateText, event.dateEpoch, timestamp).run();
  }

  const attachments: { key: string; type: string; name: string }[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `thoughts/${thoughtId}/${safeName}`;
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    await c.env.DB.prepare(
      "INSERT INTO thought_attachment (thought_id, attachment_key, attachment_type, attachment_name) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, key, file.type, file.name).run();
    attachments.push({ key, type: file.type, name: file.name });
  }

  await upsertThoughtEmbedding(c.env, thoughtId, trimmed, timestamp, parentId);
  await bumpVersion(c.env.DB);

  const thought = {
    id: thoughtId,
    body: trimmed,
    timestamp,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    parent_id: parentId,
    attachments,
  };

  return c.json(thought, 201);
});

app.delete("/thoughts/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  const descendants = await c.env.DB.prepare(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM thought WHERE id = ?
       UNION ALL
       SELECT t.id FROM thought t JOIN descendants d ON t.parent_id = d.id
     )
     SELECT id FROM descendants`
  ).bind(id).all();

  const descendantIds = descendants.results.map((r) => r.id as number);

  if (descendantIds.length === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  const placeholders = descendantIds.map(() => "?").join(",");
  const attachments = await c.env.DB.prepare(
    `SELECT attachment_key FROM thought_attachment WHERE thought_id IN (${placeholders})`
  ).bind(...descendantIds).all();

  const keys = attachments.results.map((a) => a.attachment_key as string);
  if (keys.length > 0) {
    await c.env.BUCKET.delete(keys);
  }

  const result = await c.env.DB.prepare(
    "DELETE FROM thought WHERE id = ?"
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  await c.env.DB.prepare(
    "DELETE FROM tag WHERE id NOT IN (SELECT DISTINCT tag_id FROM thought_tag)"
  ).run();

  await deleteThoughtEmbeddings(c.env, descendantIds);
  await bumpVersion(c.env.DB);

  return c.body(null, 204);
});

app.get("/tasks", async (c) => {
  const status = c.req.query("status") || "incomplete";
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];

  let baseWhere = status === "all" ? "" : "WHERE tk.completed_at IS NULL";
  let tagFilter = "";

  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    tagFilter = `${baseWhere ? " AND" : " WHERE"} tk.thought_id IN (
      SELECT tt.thought_id FROM thought_tag tt
      JOIN tag tg ON tg.id = tt.tag_id
      WHERE tg.name IN (${placeholders})
      GROUP BY tt.thought_id
      HAVING COUNT(DISTINCT tg.name) = ?
    )`;
  }

  const query = `SELECT tk.id, tk.thought_id, tk.title, tk.description, tk.created_at, tk.completed_at FROM task tk ${baseWhere}${tagFilter} ORDER BY tk.created_at DESC`;
  const bindings = tags.length > 0 ? [...tags, tags.length] : [];

  const results = await c.env.DB.prepare(query).bind(...bindings).all();

  return c.json({ tasks: results.results });
});

app.patch("/tasks/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const { completed } = await c.req.json<{ completed: boolean }>();

  if (completed) {
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare(
      "UPDATE task SET completed_at = ? WHERE id = ?"
    ).bind(now, id).run();
  } else {
    await c.env.DB.prepare(
      "UPDATE task SET completed_at = NULL WHERE id = ?"
    ).bind(id).run();
  }

  const task = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, created_at, completed_at FROM task WHERE id = ?"
  ).bind(id).first();

  if (!task) {
    return c.json({ error: "Not found" }, 404);
  }

  await bumpVersion(c.env.DB);

  return c.json(task);
});

app.get("/events", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  let query = "SELECT id, thought_id, title, description, date_text, date_epoch, created_at FROM event";
  const bindings: (string | number)[] = [];

  if (from && to) {
    query += " WHERE date_epoch >= ? AND date_epoch < ?";
    bindings.push(parseInt(from, 10), parseInt(to, 10));
  } else if (from) {
    query += " WHERE date_epoch >= ?";
    bindings.push(parseInt(from, 10));
  } else if (to) {
    query += " WHERE date_epoch < ?";
    bindings.push(parseInt(to, 10));
  }

  query += " ORDER BY date_epoch ASC";

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ events: results.results });
});

// --- Comments ---

app.get("/comments", async (c) => {
  const slug = c.req.query("slug");
  if (!slug) {
    return c.json({ error: "Missing slug parameter" }, 400);
  }

  const results = await c.env.DB.prepare(
    `SELECT id, post_slug, author_name, body, created_at, parent_id
     FROM comment
     WHERE post_slug = ?
     ORDER BY created_at ASC`
  ).bind(slug).all();

  return c.json({ comments: results.results });
});

app.post("/comments", async (c) => {
  const json = await c.req.json<{
    slug: string;
    author_name: string;
    body: string;
    parent_id?: number | null;
    hp?: string;
  }>();

  // Honeypot check
  if (json.hp) {
    // Silently accept but don't store (fool bots into thinking it worked)
    return c.json({ id: 0, post_slug: json.slug, author_name: json.author_name, body: json.body, created_at: 0, parent_id: null }, 201);
  }

  const slug = (json.slug || "").trim();
  const authorName = (json.author_name || "").trim();
  const body = (json.body || "").trim();
  const parentId = json.parent_id ?? null;

  if (!slug) {
    return c.json({ error: "slug is required" }, 400);
  }
  if (!authorName || authorName.length > 100) {
    return c.json({ error: "author_name must be 1-100 characters" }, 400);
  }
  if (!body || body.length > 2000) {
    return c.json({ error: "body must be 1-2000 characters" }, 400);
  }

  if (parentId != null) {
    const parent = await c.env.DB.prepare(
      "SELECT id FROM comment WHERE id = ?"
    ).bind(parentId).first();
    if (!parent) {
      return c.json({ error: "Parent comment not found" }, 404);
    }
  }

  const createdAt = Math.floor(Date.now() / 1000);

  const result = await c.env.DB.prepare(
    "INSERT INTO comment (post_slug, author_name, body, created_at, parent_id) VALUES (?, ?, ?, ?, ?)"
  ).bind(slug, authorName, body, createdAt, parentId).run();

  return c.json({
    id: result.meta.last_row_id,
    post_slug: slug,
    author_name: authorName,
    body,
    created_at: createdAt,
    parent_id: parentId,
  }, 201);
});

app.delete("/comments/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");

  // Delete the comment and all its replies (CASCADE handles replies)
  const result = await c.env.DB.prepare(
    "DELETE FROM comment WHERE id = ?"
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

app.get("/attachments/*", async (c) => {
  const key = c.req.path.replace(/^\/attachments\//, "");
  if (!key) return c.json({ error: "Not found" }, 404);

  const object = await c.env.BUCKET.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

export default app;
