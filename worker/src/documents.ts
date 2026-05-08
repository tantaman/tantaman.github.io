import { Hono } from "hono";
import type { Env } from "./index";
import { CreateDocumentBody, UpdateDocumentBody } from "./schemas";

export const documents = new Hono<{ Bindings: Env }>();

function isAuthed(c: { req: { header: (name: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

interface DocumentRow {
  id: number;
  title: string;
  body: string;
  private: number;
  created_at: number;
  updated_at: number;
}

function rowToDoc(row: DocumentRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    private: !!row.private,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// List (without body for efficiency)
documents.get("/", async (c) => {
  const authed = isAuthed(c);
  const limit = Math.min(parseInt(c.req.query("limit") || "100", 10) || 100, 500);
  const offset = parseInt(c.req.query("offset") || "0", 10) || 0;

  const where = authed ? "" : "WHERE private = 0";
  const results = await c.env.DB.prepare(
    `SELECT id, title, '' AS body, private, created_at, updated_at FROM document ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<DocumentRow>();

  const hasMore = results.results.length === limit;
  return c.json({
    documents: results.results.map(rowToDoc),
    meta: { limit, offset, hasMore },
  });
});

// Get single document
documents.get("/:id", async (c) => {
  const authed = isAuthed(c);
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, title, body, private, created_at, updated_at FROM document WHERE id = ?"
  ).bind(id).first<DocumentRow>();

  if (!row) return c.json({ error: "Not found" }, 404);
  if (row.private && !authed) return c.json({ error: "Not found" }, 404);

  return c.json(rowToDoc(row));
});

// Create
documents.post("/", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const { title, body, private: priv } = CreateDocumentBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  const result = await c.env.DB.prepare(
    "INSERT INTO document (title, body, private, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(title.trim(), body || "", priv ? 1 : 0, now, now).run();

  return c.json({
    id: result.meta.last_row_id as number,
    title: title.trim(),
    body: body || "",
    private: !!priv,
    created_at: now,
    updated_at: now,
  }, 201);
});

// Update (PATCH semantics)
documents.patch("/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const updates = UpdateDocumentBody.parse(await c.req.json());

  const existing = await c.env.DB.prepare("SELECT id FROM document WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Not found" }, 404);

  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ["updated_at = ?"];
  const bindings: (string | number | null)[] = [now];

  if (updates.title !== undefined) {
    sets.push("title = ?");
    bindings.push(updates.title.trim());
  }
  if (updates.body !== undefined) {
    sets.push("body = ?");
    bindings.push(updates.body);
  }
  if (updates.private !== undefined) {
    sets.push("private = ?");
    bindings.push(updates.private ? 1 : 0);
  }

  bindings.push(parseInt(id));
  await c.env.DB.prepare(`UPDATE document SET ${sets.join(", ")} WHERE id = ?`).bind(...bindings).run();

  const row = await c.env.DB.prepare(
    "SELECT id, title, body, private, created_at, updated_at FROM document WHERE id = ?"
  ).bind(id).first<DocumentRow>();

  return c.json(rowToDoc(row!));
});

// Delete
documents.delete("/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("DELETE FROM document WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
