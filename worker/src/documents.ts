import { Hono } from "hono";
import type { Env } from "./index";
import { CreateDocumentBody, UpdateDocumentBody } from "./schemas";

export const documents = new Hono<{ Bindings: Env }>();
// re-exported so the collab helpers can name it in their type signatures
export type { Env };

function isAuthed(c: { req: { header: (name: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

interface DocumentRow {
  id: number;
  title: string;
  body: string;
  private: number;
  slug: string | null;
  status: string;
  frontmatter: string;
  created_at: number;
  updated_at: number;
  collab_version: number;
  doc_json: string | null;
}

function rowToDoc(row: DocumentRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    private: !!row.private,
    slug: row.slug,
    status: row.status,
    frontmatter: JSON.parse(row.frontmatter || "{}"),
    created_at: row.created_at,
    updated_at: row.updated_at,
    collab_version: row.collab_version,
    doc_json: row.doc_json ? JSON.parse(row.doc_json) : null,
  };
}

// List (without body for efficiency)
documents.get("/", async (c) => {
  const authed = isAuthed(c);
  const status = c.req.query("status"); // optional: 'document' | 'draft' | 'published'
  const limit = Math.min(parseInt(c.req.query("limit") || "100", 10) || 100, 500);
  const offset = parseInt(c.req.query("offset") || "0", 10) || 0;

  const conds: string[] = [];
  const bindings: (string | number)[] = [];
  if (!authed) conds.push("private = 0");
  if (status) {
    conds.push("status = ?");
    bindings.push(status);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  bindings.push(limit, offset);
  const results = await c.env.DB.prepare(
    `SELECT id, title, '' AS body, private, slug, status, frontmatter, created_at, updated_at, collab_version, NULL AS doc_json
     FROM document ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).bind(...bindings).all<DocumentRow>();

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
    "SELECT id, title, body, private, slug, status, frontmatter, created_at, updated_at, collab_version, doc_json FROM document WHERE id = ?"
  ).bind(id).first<DocumentRow>();

  if (!row) return c.json({ error: "Not found" }, 404);
  if (row.private && !authed) return c.json({ error: "Not found" }, 404);

  return c.json(rowToDoc(row));
});

// Create
documents.post("/", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const parsed = CreateDocumentBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);
  const status = parsed.status ?? "document";
  const slug = parsed.slug ?? null;
  const frontmatter = JSON.stringify(parsed.frontmatter ?? {});

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO document (title, body, private, slug, status, frontmatter, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      parsed.title.trim(),
      parsed.body || "",
      parsed.private ? 1 : 0,
      slug,
      status,
      frontmatter,
      now,
      now,
    ).run();

    return c.json({
      id: result.meta.last_row_id as number,
      title: parsed.title.trim(),
      body: parsed.body || "",
      private: !!parsed.private,
      slug,
      status,
      frontmatter: parsed.frontmatter ?? {},
      created_at: now,
      updated_at: now,
      collab_version: 0,
      doc_json: null,
    }, 201);
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "Slug already exists" }, 409);
    }
    throw e;
  }
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
  if (updates.slug !== undefined) {
    sets.push("slug = ?");
    bindings.push(updates.slug);
  }
  if (updates.status !== undefined) {
    sets.push("status = ?");
    bindings.push(updates.status);
  }
  if (updates.frontmatter !== undefined) {
    sets.push("frontmatter = ?");
    bindings.push(JSON.stringify(updates.frontmatter));
  }

  bindings.push(parseInt(id));
  try {
    await c.env.DB.prepare(`UPDATE document SET ${sets.join(", ")} WHERE id = ?`).bind(...bindings).run();
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "Slug already exists" }, 409);
    }
    throw e;
  }

  const row = await c.env.DB.prepare(
    "SELECT id, title, body, private, slug, status, frontmatter, created_at, updated_at, collab_version, doc_json FROM document WHERE id = ?"
  ).bind(id).first<DocumentRow>();

  return c.json(rowToDoc(row!));
});

// --- Collab routes — proxy to the DocCollabRoom Durable Object. -------------

type CollabCtx = {
  req: { raw: Request; param: (k: string) => string };
  env: Env;
};

async function forwardToCollabRoom(c: CollabCtx, action: string): Promise<Response> {
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: "Bad id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const objId = c.env.DOC_COLLAB.idFromName(`doc:${id}`);
  const stub = c.env.DOC_COLLAB.get(objId);
  const innerUrl = new URL(c.req.raw.url);
  innerUrl.pathname = `/collab/${id}/${action}`;
  const method = c.req.raw.method;
  const init: RequestInit = {
    method,
    headers: c.req.raw.headers,
    body: method === "GET" || method === "HEAD" ? undefined : await c.req.raw.clone().arrayBuffer(),
  };
  return stub.fetch(innerUrl.toString(), init);
}

async function visibleDoc(c: CollabCtx): Promise<{ id: number; private: number } | null> {
  return c.env.DB
    .prepare("SELECT id, private FROM document WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ id: number; private: number }>();
}

documents.get("/:id/collab/bootstrap", async (c) => {
  const row = await visibleDoc(c);
  if (!row) return c.json({ error: "Not found" }, 404);
  if (row.private && !isAuthed(c)) return c.json({ error: "Not found" }, 404);
  return forwardToCollabRoom(c, "bootstrap");
});

documents.post("/:id/collab/seed", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const row = await visibleDoc(c);
  if (!row) return c.json({ error: "Not found" }, 404);
  return forwardToCollabRoom(c, "seed");
});

documents.get("/:id/collab/steps", async (c) => {
  const row = await visibleDoc(c);
  if (!row) return c.json({ error: "Not found" }, 404);
  if (row.private && !isAuthed(c)) return c.json({ error: "Not found" }, 404);
  return forwardToCollabRoom(c, "steps");
});

documents.post("/:id/collab/steps", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  return forwardToCollabRoom(c, "steps");
});

documents.post("/:id/collab/snapshot", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  return forwardToCollabRoom(c, "snapshot");
});

// Delete
documents.delete("/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("DELETE FROM document WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
