import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Chunk {
  id: string;
  postTitle: string;
  postUrl: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

interface Env {
  AI: Ai;
  EMBEDDINGS: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  THOUGHT_SECRET: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Module-level cache for embeddings data
let cachedChunks: Chunk[] | null = null;

async function loadChunks(kv: KVNamespace): Promise<Chunk[]> {
  if (cachedChunks) return cachedChunks;

  const data = await kv.get("embeddings:all", "json");
  if (!data) throw new Error("Embeddings not found in KV");

  cachedChunks = data as Chunk[];
  return cachedChunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function createMcpServer(env: Env) {
  const server = new McpServer({
    name: "tantaman-blog",
    version: "1.0.0",
  });

  server.tool(
    "search_blog",
    "Search Matt Wonlaw's blog (tantaman.com) for relevant content. Returns passages from blog posts matching the query. Use this to answer questions about topics the blog covers, including CRDTs, local-first software, SQLite, distributed systems, and other technical topics.",
    { query: z.string().describe("The search query or question to find relevant blog content for") },
    async ({ query }) => {
      // Embed the query using Workers AI
      const queryEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [query],
      }) as { data: number[][] };

      const queryVec = queryEmbedding.data[0];

      // Load chunks from KV
      const chunks = await loadChunks(env.EMBEDDINGS);

      // Compute similarities
      const scored = chunks.map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryVec, chunk.embedding),
      }));

      // Sort by score descending, take top 8
      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, 8);

      // Format response
      const lines = [`Found ${topResults.length} relevant passages from the blog:\n`];

      for (let i = 0; i < topResults.length; i++) {
        const { chunk, score } = topResults[i];
        lines.push(
          `--- [${i + 1}] From "${chunk.postTitle}" (${chunk.postUrl}) [relevance: ${score.toFixed(3)}] ---`
        );
        lines.push(chunk.text);
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  return server;
}

function extractTags(body: string): string[] {
  const matches = body.matchAll(/(^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g);
  const tags = new Set<string>();
  for (const m of matches) tags.add(m[2].toLowerCase());
  return [...tags];
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

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

app.get("/thoughts", async (c) => {
  const limitParam = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offsetParam = parseInt(c.req.query("offset") || "0", 10) || 0;
  const tag = c.req.query("tag");

  let results;
  if (tag) {
    results = await c.env.DB.prepare(
      `SELECT t.id, t.body, t.timestamp, t.created_at,
         (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id) AS reply_count
       FROM thought t
       JOIN thought_tag tt ON tt.thought_id = t.id
       JOIN tag tg ON tg.id = tt.tag_id AND tg.name = ?
       WHERE t.parent_id IS NULL
       ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`
    ).bind(tag, limitParam, offsetParam).all();
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
  const results = await c.env.DB.prepare(
    `SELECT t.name, COUNT(tt.thought_id) AS count
     FROM tag t
     JOIN thought_tag tt ON tt.tag_id = t.id
     JOIN thought th ON th.id = tt.thought_id AND th.parent_id IS NULL
     GROUP BY t.id
     ORDER BY count DESC`
  ).all();
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
    files = formData.getAll("file").filter((f): f is File => f instanceof File);
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

  const attachments = await c.env.DB.prepare(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM thought WHERE id = ?
       UNION ALL
       SELECT t.id FROM thought t JOIN descendants d ON t.parent_id = d.id
     )
     SELECT attachment_key FROM thought_attachment WHERE thought_id IN (SELECT id FROM descendants)`
  ).bind(id).all();

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

app.post("/admin/backfill-tags", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const allThoughts = await c.env.DB.prepare(
    "SELECT id, body FROM thought"
  ).all();

  let tagsCreated = 0;
  let linksCreated = 0;

  for (const thought of allThoughts.results) {
    const tags = extractTags(thought.body as string);
    for (const tagName of tags) {
      const tagResult = await c.env.DB.prepare(
        "INSERT OR IGNORE INTO tag (name) VALUES (?)"
      ).bind(tagName).run();
      if (tagResult.meta.changes > 0) tagsCreated++;

      const tagRow = await c.env.DB.prepare(
        "SELECT id FROM tag WHERE name = ?"
      ).bind(tagName).first();

      const linkResult = await c.env.DB.prepare(
        "INSERT OR IGNORE INTO thought_tag (thought_id, tag_id) VALUES (?, ?)"
      ).bind(thought.id, tagRow!.id).run();
      if (linkResult.meta.changes > 0) linksCreated++;
    }
  }

  return c.json({
    thoughtsScanned: allThoughts.results.length,
    tagsCreated,
    linksCreated,
  });
});

export default app;
