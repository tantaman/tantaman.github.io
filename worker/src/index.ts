import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { ZodError } from "zod";
import { extractEvents } from "./events";
import { extractTasks } from "./tasks";
import { extractTags } from "./tags";
import { createMcpServer } from "./mcp";
import { embedText, upsertThoughtEmbedding, deleteThoughtEmbeddings } from "./embeddings";
import { dha } from "./dha";
import {
  CreateThoughtBody,
  UpdateTaskBody,
  CreateFramingBody,
  UpdateFramingBody,
  PlaceNodeBody,
  UpdateNodeBody,
  CreateEdgeBody,
  UpdateEdgeBody,
  BatchUpdateBody,
} from "./schemas";

export interface Env {
  AI: Ai;
  EMBEDDINGS: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  VECTORIZE: Vectorize;
  THOUGHT_SECRET: string;
  DHA_SECRET: string;
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

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: err.issues[0].message }, 400);
  }
  throw err;
});

app.use("*", cors());

// --- API sub-app ---
const api = new Hono<{ Bindings: Env }>();

// Auto-bump version after any successful mutation
api.use("*", async (c, next) => {
  await next();
  if (c.req.method !== "GET" && c.res.ok) {
    await bumpVersion(c.env.DB);
  }
});

// ETag / 304 Not Modified for GET requests
api.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    return next();
  }

  // Skip non-API routes (attachments have their own cache headers, MCP is not cacheable)
  const path = c.req.path;
  if (path.startsWith("/attachments/") || path.startsWith("/dha/") || path === "/mcp" || path === "/") {
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

api.all("/mcp", async (c) => {
  const server = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport();

  await server.connect(transport);
  return transport.handleRequest(c);
});

api.get("/", (c) => {
  return c.json({
    name: "tantaman-api",
    description: "API for tantaman.com blog, including MCP server for AI-assisted search",
    mcp: "/api/mcp",
  });
});

api.get("/thoughts/search", async (c) => {
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
    `SELECT t.id, t.body, t.timestamp, t.created_at, t.parent_id, t.color,
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

api.get("/thoughts", async (c) => {
  const limitParam = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offsetParam = parseInt(c.req.query("offset") || "0", 10) || 0;
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];

  let results;
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    results = await c.env.DB.prepare(
      `SELECT t.id, t.body, t.timestamp, t.created_at, t.color,
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
      `SELECT t.id, t.body, t.timestamp, t.created_at, t.color,
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

api.get("/thoughts/tags", async (c) => {
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

api.get("/thoughts/:id/replies", async (c) => {
  const parentId = c.req.param("id");

  // Fetch parent thought
  const parentRow = await c.env.DB.prepare(
    `SELECT t.id, t.parent_id, t.body, t.timestamp, t.created_at, t.color,
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
    `WITH RECURSIVE descendants(id, parent_id, body, timestamp, created_at, color, depth) AS (
       SELECT id, parent_id, body, timestamp, created_at, color, 0
       FROM thought WHERE parent_id = ?
       UNION ALL
       SELECT t.id, t.parent_id, t.body, t.timestamp, t.created_at, t.color, d.depth + 1
       FROM thought t JOIN descendants d ON t.parent_id = d.id
     )
     SELECT d.id, d.parent_id, d.body, d.timestamp, d.created_at, d.color, d.depth,
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

api.post("/thoughts", async (c) => {
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
    const json = CreateThoughtBody.parse(await c.req.json());
    trimmed = (json.body || "").trim();
    if (json.parent_id != null) parentId = json.parent_id;
  }

  if (!trimmed) {
    return c.json({ error: "Body must be non-empty" }, 400);
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

  const color = await upsertThoughtEmbedding(c.env, thoughtId, trimmed, timestamp, parentId);

  const thought = {
    id: thoughtId,
    body: trimmed,
    timestamp,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    parent_id: parentId,
    attachments,
    color,
  };

  return c.json(thought, 201);
});

api.delete("/thoughts/:id", async (c) => {
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

  return c.body(null, 204);
});

api.get("/tasks", async (c) => {
  const status = c.req.query("status") || "incomplete";
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];

  let baseWhere = "";
  if (status === "incomplete") {
    baseWhere = "WHERE tk.completed_at IS NULL AND tk.deprioritized_at IS NULL";
  } else if (status === "deprioritized") {
    baseWhere = "WHERE tk.deprioritized_at IS NOT NULL AND tk.completed_at IS NULL";
  }
  // status === "all" → no filter

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

  const query = `SELECT tk.id, tk.thought_id, tk.title, tk.description, tk.created_at, tk.completed_at, tk.deprioritized_at FROM task tk ${baseWhere}${tagFilter} ORDER BY tk.created_at DESC`;
  const bindings = tags.length > 0 ? [...tags, tags.length] : [];

  const results = await c.env.DB.prepare(query).bind(...bindings).all();

  return c.json({ tasks: results.results });
});

api.patch("/tasks/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const { completed, deprioritized } = UpdateTaskBody.parse(await c.req.json());

  if (completed !== undefined) {
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
  }

  if (deprioritized !== undefined) {
    if (deprioritized) {
      const now = Math.floor(Date.now() / 1000);
      await c.env.DB.prepare(
        "UPDATE task SET deprioritized_at = ? WHERE id = ?"
      ).bind(now, id).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE task SET deprioritized_at = NULL WHERE id = ?"
      ).bind(id).run();
    }
  }

  const task = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, created_at, completed_at, deprioritized_at FROM task WHERE id = ?"
  ).bind(id).first();

  if (!task) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(task);
});

api.get("/events", async (c) => {
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

// --- Framings ---

api.get("/framings", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT id, name, description, created_at, updated_at FROM framing ORDER BY updated_at DESC"
  ).all();
  return c.json({ framings: results.results });
});

api.post("/framings", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { name, description } = CreateFramingBody.parse(await c.req.json());

  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB.prepare(
    "INSERT INTO framing (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).bind(name.trim(), description?.trim() || null, now, now).run();

  return c.json({
    id: result.meta.last_row_id,
    name: name.trim(),
    description: description?.trim() || null,
    created_at: now,
    updated_at: now,
  }, 201);
});

api.get("/framings/:id", async (c) => {
  const id = c.req.param("id");

  const framing = await c.env.DB.prepare(
    "SELECT id, name, description, created_at, updated_at FROM framing WHERE id = ?"
  ).bind(id).first();

  if (!framing) {
    return c.json({ error: "Not found" }, 404);
  }

  const nodes = await c.env.DB.prepare(
    `SELECT fn.id, fn.node_type, fn.item_id, fn.x, fn.y, fn.w, fn.h,
            t.body, t.timestamp, t.color
     FROM framing_node fn
     LEFT JOIN thought t ON fn.node_type = 'thought' AND t.id = CAST(fn.item_id AS INTEGER)
     WHERE fn.framing_id = ?`
  ).bind(id).all();

  const edges = await c.env.DB.prepare(
    "SELECT id, source_node_id, target_node_id, label, source_handle, target_handle FROM framing_edge WHERE framing_id = ?"
  ).bind(id).all();

  return c.json({
    framing,
    nodes: nodes.results,
    edges: edges.results,
  });
});

api.patch("/framings/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const { name, description } = UpdateFramingBody.parse(await c.req.json());

  const existing = await c.env.DB.prepare(
    "SELECT id FROM framing WHERE id = ?"
  ).bind(id).first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ["updated_at = ?"];
  const bindings: (string | number | null)[] = [now];

  if (name !== undefined) {
    sets.push("name = ?");
    bindings.push(name.trim());
  }
  if (description !== undefined) {
    sets.push("description = ?");
    bindings.push(description?.trim() || null);
  }

  bindings.push(parseInt(id));
  await c.env.DB.prepare(
    `UPDATE framing SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...bindings).run();

  const updated = await c.env.DB.prepare(
    "SELECT id, name, description, created_at, updated_at FROM framing WHERE id = ?"
  ).bind(id).first();

  return c.json(updated);
});

api.delete("/framings/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const result = await c.env.DB.prepare(
    "DELETE FROM framing WHERE id = ?"
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// --- Framing Nodes ---

api.post("/framings/:id/nodes", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const { node_type, item_id, x, y, w, h } = PlaceNodeBody.parse(await c.req.json());

  const framing = await c.env.DB.prepare("SELECT id FROM framing WHERE id = ?").bind(framingId).first();
  if (!framing) {
    return c.json({ error: "Framing not found" }, 404);
  }

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO framing_node (framing_id, node_type, item_id, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(parseInt(framingId), node_type, item_id, x, y, w ?? null, h ?? null).run();

    return c.json({
      id: result.meta.last_row_id,
      framing_id: parseInt(framingId),
      node_type,
      item_id,
      x,
      y,
      w: w ?? null,
      h: h ?? null,
    }, 201);
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "Item already placed in this framing" }, 409);
    }
    throw e;
  }
});

api.patch("/framings/:id/nodes/:nodeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const nodeId = c.req.param("nodeId");
  const updates = UpdateNodeBody.parse(await c.req.json());

  const sets: string[] = [];
  const bindings: (number | null)[] = [];

  if (updates.x !== undefined) { sets.push("x = ?"); bindings.push(updates.x); }
  if (updates.y !== undefined) { sets.push("y = ?"); bindings.push(updates.y); }
  if (updates.w !== undefined) { sets.push("w = ?"); bindings.push(updates.w); }
  if (updates.h !== undefined) { sets.push("h = ?"); bindings.push(updates.h); }

  if (sets.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  bindings.push(parseInt(nodeId), parseInt(framingId));
  const result = await c.env.DB.prepare(
    `UPDATE framing_node SET ${sets.join(", ")} WHERE id = ? AND framing_id = ?`
  ).bind(...bindings).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  const node = await c.env.DB.prepare(
    "SELECT id, framing_id, node_type, item_id, x, y, w, h FROM framing_node WHERE id = ?"
  ).bind(nodeId).first();

  return c.json(node);
});

api.delete("/framings/:id/nodes/:nodeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const nodeId = c.req.param("nodeId");

  const result = await c.env.DB.prepare(
    "DELETE FROM framing_node WHERE id = ? AND framing_id = ?"
  ).bind(nodeId, framingId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// --- Framing Edges ---

api.post("/framings/:id/edges", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const { source_node_id, target_node_id, label, source_handle, target_handle } = CreateEdgeBody.parse(await c.req.json());

  const result = await c.env.DB.prepare(
    "INSERT INTO framing_edge (framing_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(parseInt(framingId), source_node_id, target_node_id, label?.trim() || null, source_handle || null, target_handle || null).run();

  return c.json({
    id: result.meta.last_row_id,
    framing_id: parseInt(framingId),
    source_node_id,
    target_node_id,
    label: label?.trim() || null,
    source_handle: source_handle || null,
    target_handle: target_handle || null,
  }, 201);
});

api.patch("/framings/:id/edges/:edgeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const edgeId = c.req.param("edgeId");
  const { label } = UpdateEdgeBody.parse(await c.req.json());

  const result = await c.env.DB.prepare(
    "UPDATE framing_edge SET label = ? WHERE id = ? AND framing_id = ?"
  ).bind(label?.trim() || null, edgeId, framingId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  const edge = await c.env.DB.prepare(
    "SELECT id, framing_id, source_node_id, target_node_id, label, source_handle, target_handle FROM framing_edge WHERE id = ?"
  ).bind(edgeId).first();

  return c.json(edge);
});

api.delete("/framings/:id/edges/:edgeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const edgeId = c.req.param("edgeId");

  const result = await c.env.DB.prepare(
    "DELETE FROM framing_edge WHERE id = ? AND framing_id = ?"
  ).bind(edgeId, framingId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// --- Framing Batch ---

api.patch("/framings/:id/batch", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = parseInt(c.req.param("id"));
  const { nodes } = BatchUpdateBody.parse(await c.req.json());

  const stmts = nodes.map((n) =>
    c.env.DB.prepare(
      "UPDATE framing_node SET x = ?, y = ?, w = ?, h = ? WHERE id = ? AND framing_id = ?"
    ).bind(n.x, n.y, n.w ?? null, n.h ?? null, n.node_id, framingId)
  );

  await c.env.DB.batch(stmts);

  return c.json({ updated: nodes.length });
});

api.get("/attachments/*", async (c) => {
  const key = c.req.path.replace(/^\/attachments\//, "");
  if (!key) return c.json({ error: "Not found" }, 404);

  const object = await c.env.BUCKET.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

api.route("/dha", dha);

// Mount API routes
app.route("/api", api);

export default app;
