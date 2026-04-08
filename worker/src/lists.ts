import { Hono } from "hono";
import type { Env } from "./index";
import {
  CreateListBody,
  UpdateListBody,
  CreateListItemBody,
  UpdateListItemBody,
  ReorderListItemsBody,
} from "./schemas";

export const lists = new Hono<{ Bindings: Env }>();

// Auth middleware for all list routes
lists.use("*", async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// List active lists (with item counts)
lists.get("/", async (c) => {
  const includeArchived = c.req.query("archived") === "true";

  let query = `
    SELECT l.id, l.name, l.created_at, l.archived_at,
      COUNT(li.id) as item_count,
      SUM(CASE WHEN li.completed = 1 THEN 1 ELSE 0 END) as completed_count
    FROM list l
    LEFT JOIN list_item li ON li.list_id = l.id
  `;

  if (!includeArchived) {
    query += " WHERE l.archived_at IS NULL";
  }

  query += " GROUP BY l.id ORDER BY l.created_at DESC";

  const results = await c.env.DB.prepare(query).all();
  return c.json({ lists: results.results });
});

// Create a new list
lists.post("/", async (c) => {
  const { name } = CreateListBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  const result = await c.env.DB.prepare(
    "INSERT INTO list (name, created_at) VALUES (?, ?)"
  ).bind(name, now).run();

  return c.json({
    id: result.meta.last_row_id,
    name,
    created_at: now,
    archived_at: null,
    item_count: 0,
    completed_count: 0,
  }, 201);
});

// Get a single list with all items
lists.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const list = await c.env.DB.prepare(
    "SELECT id, name, created_at, archived_at FROM list WHERE id = ?"
  ).bind(id).first();

  if (!list) {
    return c.json({ error: "Not found" }, 404);
  }

  const items = await c.env.DB.prepare(
    "SELECT id, list_id, text, completed, position, created_at FROM list_item WHERE list_id = ? ORDER BY position ASC, created_at ASC"
  ).bind(id).all();

  return c.json({ list, items: items.results });
});

// Update list name
lists.patch("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const updates = UpdateListBody.parse(await c.req.json());

  const existing = await c.env.DB.prepare("SELECT id FROM list WHERE id = ?").bind(id).first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  if (updates.name !== undefined) {
    await c.env.DB.prepare("UPDATE list SET name = ? WHERE id = ?")
      .bind(updates.name, id).run();
  }

  const list = await c.env.DB.prepare(
    "SELECT id, name, created_at, archived_at FROM list WHERE id = ?"
  ).bind(id).first();

  return c.json(list);
});

// Delete a list (cascade deletes items)
lists.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const result = await c.env.DB.prepare("DELETE FROM list WHERE id = ?").bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// Archive a list
lists.post("/:id/archive", async (c) => {
  const id = parseInt(c.req.param("id"));
  const now = Math.floor(Date.now() / 1000);

  const result = await c.env.DB.prepare(
    "UPDATE list SET archived_at = ? WHERE id = ? AND archived_at IS NULL"
  ).bind(now, id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found or already archived" }, 404);
  }

  return c.json({ archived_at: now });
});

// Add an item to a list
lists.post("/:id/items", async (c) => {
  const listId = parseInt(c.req.param("id"));
  const { text } = CreateListItemBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  const existing = await c.env.DB.prepare("SELECT id FROM list WHERE id = ?").bind(listId).first();
  if (!existing) {
    return c.json({ error: "List not found" }, 404);
  }

  const maxPos = await c.env.DB.prepare(
    "SELECT MAX(position) as max_pos FROM list_item WHERE list_id = ?"
  ).bind(listId).first<{ max_pos: number | null }>();

  const position = (maxPos?.max_pos ?? -1) + 1;

  const result = await c.env.DB.prepare(
    "INSERT INTO list_item (list_id, text, position, created_at) VALUES (?, ?, ?, ?)"
  ).bind(listId, text, position, now).run();

  return c.json({
    id: result.meta.last_row_id,
    list_id: listId,
    text,
    completed: 0,
    position,
    created_at: now,
  }, 201);
});

// Update an item
lists.patch("/:id/items/:itemId", async (c) => {
  const listId = parseInt(c.req.param("id"));
  const itemId = parseInt(c.req.param("itemId"));
  const updates = UpdateListItemBody.parse(await c.req.json());

  const existing = await c.env.DB.prepare(
    "SELECT id FROM list_item WHERE id = ? AND list_id = ?"
  ).bind(itemId, listId).first();

  if (!existing) {
    return c.json({ error: "Item not found" }, 404);
  }

  const sets: string[] = [];
  const bindings: (string | number)[] = [];

  if (updates.text !== undefined) {
    sets.push("text = ?");
    bindings.push(updates.text);
  }
  if (updates.completed !== undefined) {
    sets.push("completed = ?");
    bindings.push(updates.completed ? 1 : 0);
  }
  if (updates.position !== undefined) {
    sets.push("position = ?");
    bindings.push(updates.position);
  }

  if (sets.length > 0) {
    bindings.push(itemId, listId);
    await c.env.DB.prepare(
      `UPDATE list_item SET ${sets.join(", ")} WHERE id = ? AND list_id = ?`
    ).bind(...bindings).run();
  }

  const item = await c.env.DB.prepare(
    "SELECT id, list_id, text, completed, position, created_at FROM list_item WHERE id = ?"
  ).bind(itemId).first();

  return c.json(item);
});

// Delete an item
lists.delete("/:id/items/:itemId", async (c) => {
  const listId = parseInt(c.req.param("id"));
  const itemId = parseInt(c.req.param("itemId"));

  const result = await c.env.DB.prepare(
    "DELETE FROM list_item WHERE id = ? AND list_id = ?"
  ).bind(itemId, listId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.body(null, 204);
});

// Batch reorder items
lists.patch("/:id/items/reorder", async (c) => {
  const listId = parseInt(c.req.param("id"));
  const { items } = ReorderListItemsBody.parse(await c.req.json());

  const stmts = items.map(({ id, position }) =>
    c.env.DB.prepare(
      "UPDATE list_item SET position = ? WHERE id = ? AND list_id = ?"
    ).bind(position, id, listId)
  );

  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});
