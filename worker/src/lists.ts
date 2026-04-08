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

function isAuthed(c: any): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

// Helper to look up a list by UUID
async function getListByUuid(db: any, uuid: string) {
  return db.prepare(
    "SELECT id, uuid, name, created_at, archived_at FROM list WHERE uuid = ?"
  ).bind(uuid).first();
}

// --- Auth-gated: dashboard and list creation ---

// List all lists (requires auth)
lists.get("/", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const includeArchived = c.req.query("archived") === "true";

  let query = `
    SELECT l.id, l.uuid, l.name, l.created_at, l.archived_at,
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

// Create a new list (requires auth)
lists.post("/", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const { name } = CreateListBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);
  const uuid = crypto.randomUUID();

  await c.env.DB.prepare(
    "INSERT INTO list (uuid, name, created_at) VALUES (?, ?, ?)"
  ).bind(uuid, name, now).run();

  return c.json({
    uuid,
    name,
    created_at: now,
    archived_at: null,
    item_count: 0,
    completed_count: 0,
  }, 201);
});

// Delete a list (requires auth)
lists.delete("/:uuid", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const uuid = c.req.param("uuid");
  const result = await c.env.DB.prepare("DELETE FROM list WHERE uuid = ?").bind(uuid).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// Archive a list (requires auth)
lists.post("/:uuid/archive", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const uuid = c.req.param("uuid");
  const now = Math.floor(Date.now() / 1000);

  const result = await c.env.DB.prepare(
    "UPDATE list SET archived_at = ? WHERE uuid = ? AND archived_at IS NULL"
  ).bind(now, uuid).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found or already archived" }, 404);
  }

  return c.json({ archived_at: now });
});

// --- Public (UUID is the capability token) ---

// Get a single list with all items
lists.get("/:uuid", async (c) => {
  const uuid = c.req.param("uuid");
  const list = await getListByUuid(c.env.DB, uuid);

  if (!list) {
    return c.json({ error: "Not found" }, 404);
  }

  const items = await c.env.DB.prepare(
    "SELECT id, list_id, text, completed, position, created_at FROM list_item WHERE list_id = ? ORDER BY position ASC, created_at ASC"
  ).bind(list.id).all();

  return c.json({ list, items: items.results });
});

// Update list name
lists.patch("/:uuid", async (c) => {
  const uuid = c.req.param("uuid");
  const updates = UpdateListBody.parse(await c.req.json());

  const list = await getListByUuid(c.env.DB, uuid);
  if (!list) {
    return c.json({ error: "Not found" }, 404);
  }

  if (updates.name !== undefined) {
    await c.env.DB.prepare("UPDATE list SET name = ? WHERE id = ?")
      .bind(updates.name, list.id).run();
  }

  const updated = await getListByUuid(c.env.DB, uuid);
  return c.json(updated);
});

// Add an item to a list
lists.post("/:uuid/items", async (c) => {
  const uuid = c.req.param("uuid");
  const { text } = CreateListItemBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  const list = await getListByUuid(c.env.DB, uuid);
  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  const maxPos = await c.env.DB.prepare(
    "SELECT MAX(position) as max_pos FROM list_item WHERE list_id = ?"
  ).bind(list.id).first<{ max_pos: number | null }>();

  const position = (maxPos?.max_pos ?? -1) + 1;

  const result = await c.env.DB.prepare(
    "INSERT INTO list_item (list_id, text, position, created_at) VALUES (?, ?, ?, ?)"
  ).bind(list.id, text, position, now).run();

  return c.json({
    id: result.meta.last_row_id,
    list_id: list.id,
    text,
    completed: 0,
    position,
    created_at: now,
  }, 201);
});

// Update an item
lists.patch("/:uuid/items/:itemId", async (c) => {
  const uuid = c.req.param("uuid");
  const itemId = parseInt(c.req.param("itemId"));
  const updates = UpdateListItemBody.parse(await c.req.json());

  const list = await getListByUuid(c.env.DB, uuid);
  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM list_item WHERE id = ? AND list_id = ?"
  ).bind(itemId, list.id).first();

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
    bindings.push(itemId, list.id);
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
lists.delete("/:uuid/items/:itemId", async (c) => {
  const uuid = c.req.param("uuid");
  const itemId = parseInt(c.req.param("itemId"));

  const list = await getListByUuid(c.env.DB, uuid);
  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  const result = await c.env.DB.prepare(
    "DELETE FROM list_item WHERE id = ? AND list_id = ?"
  ).bind(itemId, list.id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Item not found" }, 404);
  }

  return c.body(null, 204);
});

// Batch reorder items
lists.patch("/:uuid/items/reorder", async (c) => {
  const uuid = c.req.param("uuid");
  const { items } = ReorderListItemsBody.parse(await c.req.json());

  const list = await getListByUuid(c.env.DB, uuid);
  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  const stmts = items.map(({ id, position }) =>
    c.env.DB.prepare(
      "UPDATE list_item SET position = ? WHERE id = ? AND list_id = ?"
    ).bind(position, id, list.id)
  );

  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});
