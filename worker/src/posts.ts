import { Hono } from "hono";
import type { Env } from "./index";
import { CreatePostBody, UpdatePostBody } from "./schemas";

export const posts = new Hono<{ Bindings: Env }>();

// Auth middleware for all post routes
posts.use("*", async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// List posts (without body)
posts.get("/", async (c) => {
  const status = c.req.query("status");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offset = parseInt(c.req.query("offset") || "0", 10) || 0;

  let query = "SELECT id, title, slug, frontmatter, status, created_at, updated_at FROM post";
  const bindings: (string | number)[] = [];

  if (status) {
    query += " WHERE status = ?";
    bindings.push(status);
  }

  query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  bindings.push(limit, offset);

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  const hasMore = results.results.length === limit;

  const posts = results.results.map((row) => ({
    ...row,
    frontmatter: JSON.parse(row.frontmatter as string),
  }));

  return c.json({ posts, meta: { limit, offset, hasMore } });
});

// Get single post (with body)
posts.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, title, slug, body, frontmatter, status, created_at, updated_at FROM post WHERE id = ?"
  ).bind(id).first();

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    ...row,
    frontmatter: JSON.parse(row.frontmatter as string),
  });
});

// Create post
posts.post("/", async (c) => {
  const { title, slug, body, frontmatter } = CreatePostBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO post (title, slug, body, frontmatter, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      title.trim(),
      slug,
      body || "",
      JSON.stringify(frontmatter || {}),
      now,
      now,
    ).run();

    return c.json({
      id: result.meta.last_row_id,
      title: title.trim(),
      slug,
      body: body || "",
      frontmatter: frontmatter || {},
      status: "draft",
      created_at: now,
      updated_at: now,
    }, 201);
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "Slug already exists" }, 409);
    }
    throw e;
  }
});

// Update post (PATCH semantics)
posts.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const updates = UpdatePostBody.parse(await c.req.json());

  const existing = await c.env.DB.prepare("SELECT id FROM post WHERE id = ?").bind(id).first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ["updated_at = ?"];
  const bindings: (string | number | null)[] = [now];

  if (updates.title !== undefined) {
    sets.push("title = ?");
    bindings.push(updates.title.trim());
  }
  if (updates.slug !== undefined) {
    sets.push("slug = ?");
    bindings.push(updates.slug);
  }
  if (updates.body !== undefined) {
    sets.push("body = ?");
    bindings.push(updates.body);
  }
  if (updates.frontmatter !== undefined) {
    sets.push("frontmatter = ?");
    bindings.push(JSON.stringify(updates.frontmatter));
  }
  if (updates.status !== undefined) {
    sets.push("status = ?");
    bindings.push(updates.status);
  }

  bindings.push(parseInt(id));

  try {
    await c.env.DB.prepare(
      `UPDATE post SET ${sets.join(", ")} WHERE id = ?`
    ).bind(...bindings).run();
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "Slug already exists" }, 409);
    }
    throw e;
  }

  const row = await c.env.DB.prepare(
    "SELECT id, title, slug, body, frontmatter, status, created_at, updated_at FROM post WHERE id = ?"
  ).bind(id).first();

  return c.json({
    ...row,
    frontmatter: JSON.parse(row!.frontmatter as string),
  });
});

// Delete post
posts.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("DELETE FROM post WHERE id = ?").bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});
