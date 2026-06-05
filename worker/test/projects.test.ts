import { describe, test, expect } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

const AUTH = { Authorization: "Bearer test-secret" };
const JSON_HEADERS = { ...AUTH, "Content-Type": "application/json" };

function req(path: string, init?: RequestInit) {
  return app.request(path, init, env);
}
function json(path: string, body: unknown, method = "POST") {
  return req(path, { method, headers: JSON_HEADERS, body: JSON.stringify(body) });
}

describe("projects: direct (thoughtless) flow", () => {
  test("create project, add tasks, dependency graph, completion", async () => {
    const created = await (await json("/api/projects", { title: "Build treehouse" })).json<any>();
    expect(created.status).toBe("active");
    expect(created.thought_id).toBeNull();
    const pid = created.id;

    const t1 = await (await json(`/api/projects/${pid}/tasks`, { title: "Buy wood" })).json<any>();
    const t2 = await (await json(`/api/projects/${pid}/tasks`, { title: "Build frame" })).json<any>();
    expect(t1.thought_id).toBeNull();
    expect(t1.project_id).toBe(pid);

    // "Build frame" is blocked by "Buy wood"
    const addRes = await json(`/api/tasks/${t2.id}/blockers`, { blocker_task_id: t1.id });
    expect(addRes.status).toBe(200);

    const detail = await (await req(`/api/projects/${pid}`)).json<any>();
    expect(detail.tasks).toHaveLength(2);
    expect(detail.deps).toEqual([{ blocker_task_id: t1.id, blocked_task_id: t2.id }]);

    // Rename a task without touching any thought
    const renamed = await (await json(`/api/tasks/${t1.id}`, { title: "Buy lumber" }, "PATCH")).json<any>();
    expect(renamed.title).toBe("Buy lumber");

    // Remove the dependency
    const del = await req(`/api/tasks/${t2.id}/blockers/${t1.id}`, { method: "DELETE", headers: AUTH });
    expect(del.status).toBe(200);
    const detail2 = await (await req(`/api/projects/${pid}`)).json<any>();
    expect(detail2.deps).toHaveLength(0);
  });

  test("rejects self-block and dependency cycles", async () => {
    const p = await (await json("/api/projects", { title: "Cycle test" })).json<any>();
    const a = await (await json(`/api/projects/${p.id}/tasks`, { title: "A" })).json<any>();
    const b = await (await json(`/api/projects/${p.id}/tasks`, { title: "B" })).json<any>();

    expect((await json(`/api/tasks/${a.id}/blockers`, { blocker_task_id: a.id })).status).toBe(400);

    // A blocks B, then B blocks A would be a cycle.
    expect((await json(`/api/tasks/${b.id}/blockers`, { blocker_task_id: a.id })).status).toBe(200);
    expect((await json(`/api/tasks/${a.id}/blockers`, { blocker_task_id: b.id })).status).toBe(400);
  });

  test("deleting a task drops its dependency edges but leaves the project", async () => {
    const p = await (await json("/api/projects", { title: "Delete test" })).json<any>();
    const a = await (await json(`/api/projects/${p.id}/tasks`, { title: "A" })).json<any>();
    const b = await (await json(`/api/projects/${p.id}/tasks`, { title: "B" })).json<any>();
    await json(`/api/tasks/${b.id}/blockers`, { blocker_task_id: a.id });

    const del = await req(`/api/tasks/${a.id}`, { method: "DELETE", headers: AUTH });
    expect(del.status).toBe(204);
    const detail = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(detail.tasks.map((t: any) => t.id)).toEqual([b.id]);
    expect(detail.deps).toHaveLength(0);
  });

  test("reorder sets explicit task order; unknown/foreign ids are no-ops", async () => {
    const p = await (await json("/api/projects", { title: "Reorder test" })).json<any>();
    const a = await (await json(`/api/projects/${p.id}/tasks`, { title: "A" })).json<any>();
    const b = await (await json(`/api/projects/${p.id}/tasks`, { title: "B" })).json<any>();
    const c = await (await json(`/api/projects/${p.id}/tasks`, { title: "C" })).json<any>();

    // Tasks come back in creation order initially.
    const before = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(before.tasks.map((t: any) => t.id)).toEqual([a.id, b.id, c.id]);

    // Reorder to C, A, B — include a bogus id and a task from another project;
    // both must be silently ignored without affecting the result.
    const other = await (await json("/api/projects", { title: "Other" })).json<any>();
    const x = await (await json(`/api/projects/${other.id}/tasks`, { title: "X" })).json<any>();
    const res = await json(`/api/projects/${p.id}/tasks/reorder`, {
      ids: [c.id, a.id, b.id, 999999, x.id],
    });
    expect(res.status).toBe(200);

    const after = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(after.tasks.map((t: any) => t.id)).toEqual([c.id, a.id, b.id]);

    // The foreign task's ordering is untouched.
    const otherDetail = await (await req(`/api/projects/${other.id}`)).json<any>();
    expect(otherDetail.tasks.map((t: any) => t.id)).toEqual([x.id]);
  });

  test("reorder requires auth", async () => {
    const p = await (await json("/api/projects", { title: "Reorder auth" })).json<any>();
    const a = await (await json(`/api/projects/${p.id}/tasks`, { title: "A" })).json<any>();
    const res = await req(`/api/projects/${p.id}/tasks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [a.id] }),
    });
    expect(res.status).toBe(401);
  });
});

describe("projects: comments", () => {
  test("create, reply, edit, and list via the hub", async () => {
    const p = await (await json("/api/projects", { title: "Comment test" })).json<any>();
    const top = await (await json(`/api/projects/${p.id}/comments`, { body: "First note" })).json<any>();
    expect(top.parent_id).toBeNull();
    expect(top.project_id).toBe(p.id);

    const reply = await (await json(`/api/projects/${p.id}/comments`, { body: "A reply", parent_id: top.id })).json<any>();
    expect(reply.parent_id).toBe(top.id);

    // Comments ship inside the project hub fetch, oldest-first.
    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.comments.map((c: any) => c.id)).toEqual([top.id, reply.id]);

    const edited = await (await json(`/api/projects/${p.id}/comments/${top.id}`, { body: "First note (v2)" }, "PATCH")).json<any>();
    expect(edited.body).toBe("First note (v2)");
    expect(edited.updated_at).not.toBeNull();
  });

  test("rejects a reply whose parent is in another project", async () => {
    const p1 = await (await json("/api/projects", { title: "P1" })).json<any>();
    const p2 = await (await json("/api/projects", { title: "P2" })).json<any>();
    const c1 = await (await json(`/api/projects/${p1.id}/comments`, { body: "in p1" })).json<any>();
    const res = await json(`/api/projects/${p2.id}/comments`, { body: "wrong parent", parent_id: c1.id });
    expect(res.status).toBe(400);
  });

  test("deleting a comment cascades to its replies", async () => {
    const p = await (await json("/api/projects", { title: "Cascade" })).json<any>();
    const parent = await (await json(`/api/projects/${p.id}/comments`, { body: "parent" })).json<any>();
    await json(`/api/projects/${p.id}/comments`, { body: "child", parent_id: parent.id });

    const del = await req(`/api/projects/${p.id}/comments/${parent.id}`, { method: "DELETE", headers: AUTH });
    expect(del.status).toBe(200);
    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.comments).toHaveLength(0);
  });

  test("comment writes require auth", async () => {
    const p = await (await json("/api/projects", { title: "Auth" })).json<any>();
    const res = await req(`/api/projects/${p.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "nope" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("projects: draft → convert", () => {
  test("convert promotes a draft and reconciles reply-tree dependencies", async () => {
    const now = Math.floor(Date.now() / 1000);
    // Seed a #p draft project on a root thought, with two reply tasks.
    const root = await env.DB.prepare("INSERT INTO thought (body, timestamp) VALUES ('#p Demo', ?)").bind(now).run();
    const rootId = root.meta.last_row_id;
    const childA = await env.DB.prepare("INSERT INTO thought (body, timestamp, parent_id) VALUES ('#t A', ?, ?)").bind(now, rootId).run();
    const childAId = childA.meta.last_row_id;
    const childB = await env.DB.prepare("INSERT INTO thought (body, timestamp, parent_id) VALUES ('#t B', ?, ?)").bind(now, childAId).run();
    const childBId = childB.meta.last_row_id;

    const proj = await env.DB.prepare(
      "INSERT INTO project (thought_id, title, status, created_at) VALUES (?, 'Demo', 'draft', ?)"
    ).bind(rootId, now).run();
    const pid = proj.meta.last_row_id;
    const ta = await env.DB.prepare("INSERT INTO task (thought_id, title, created_at, project_id) VALUES (?, 'A', ?, ?)").bind(childAId, now, pid).run();
    const tb = await env.DB.prepare("INSERT INTO task (thought_id, title, created_at, project_id) VALUES (?, 'B', ?, ?)").bind(childBId, now, pid).run();

    // Draft is hidden from the active list, present in the draft list.
    const active = await (await req("/api/projects?status=active")).json<any>();
    expect(active.projects.find((p: any) => p.id === pid)).toBeUndefined();
    const drafts = await (await req("/api/projects?status=draft")).json<any>();
    expect(drafts.projects.find((p: any) => p.id === pid)).toBeDefined();

    const converted = await (await req(`/api/projects/${pid}/convert`, { method: "POST", headers: AUTH })).json<any>();
    expect(converted.status).toBe("active");

    const detail = await (await req(`/api/projects/${pid}`)).json<any>();
    // Reply nesting A→B becomes a task dependency A blocks B.
    expect(detail.deps).toEqual([{ blocker_task_id: ta.meta.last_row_id, blocked_task_id: tb.meta.last_row_id }]);
  });
});

describe("projects: activity log", () => {
  test("records mutations newest-first in the hub", async () => {
    const p = await (await json("/api/projects", { title: "Activity project" })).json<any>();
    const t1 = await (await json(`/api/projects/${p.id}/tasks`, { title: "First task" })).json<any>();
    const t2 = await (await json(`/api/projects/${p.id}/tasks`, { title: "Second task" })).json<any>();

    // Complete then reopen.
    await json(`/api/tasks/${t1.id}`, { completed: true }, "PATCH");
    await json(`/api/tasks/${t1.id}`, { completed: false }, "PATCH");

    // Dependency add/remove.
    await json(`/api/tasks/${t2.id}/blockers`, { blocker_task_id: t1.id });
    await req(`/api/tasks/${t2.id}/blockers/${t1.id}`, { method: "DELETE", headers: AUTH });

    // Delete a task.
    await req(`/api/tasks/${t2.id}`, { method: "DELETE", headers: AUTH });

    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    const kinds = hub.activity.map((a: any) => a.kind);
    // Newest-first: the latest mutation (task_deleted) leads.
    expect(kinds[0]).toBe("task_deleted");
    // The full chain is present.
    expect(kinds).toEqual([
      "task_deleted",
      "dependency_removed",
      "dependency_added",
      "task_reopened",
      "task_completed",
      "task_added",
      "task_added",
      "project_created",
    ]);
    // created_at is non-increasing (the newest-first ordering).
    const times = hub.activity.map((a: any) => a.created_at);
    for (let i = 1; i < times.length; i++) expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    // Detail carries the title where relevant.
    const created = hub.activity.find((a: any) => a.kind === "project_created");
    expect(created.detail).toBe("Activity project");
  });

  test("convert and archive toggle are recorded", async () => {
    const now = Math.floor(Date.now() / 1000);
    const root = await env.DB.prepare("INSERT INTO thought (body, timestamp) VALUES ('#p Draft', ?)").bind(now).run();
    const proj = await env.DB.prepare(
      "INSERT INTO project (thought_id, title, status, created_at) VALUES (?, 'Draft', 'draft', ?)"
    ).bind(root.meta.last_row_id, now).run();
    const pid = proj.meta.last_row_id;

    await req(`/api/projects/${pid}/convert`, { method: "POST", headers: AUTH });
    await json(`/api/projects/${pid}`, { archived: true }, "PATCH");
    await json(`/api/projects/${pid}`, { archived: false }, "PATCH");

    const hub = await (await req(`/api/projects/${pid}`)).json<any>();
    const kinds = hub.activity.map((a: any) => a.kind);
    expect(kinds).toEqual(["project_unarchived", "project_archived", "project_activated"]);
  });

  test("renames are not logged (kept out as noise)", async () => {
    const p = await (await json("/api/projects", { title: "Quiet" })).json<any>();
    await json(`/api/projects/${p.id}`, { title: "Quieter" }, "PATCH");
    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.activity.map((a: any) => a.kind)).toEqual(["project_created"]);
  });

  test("activity is project-scoped and cascades on project delete", async () => {
    const p1 = await (await json("/api/projects", { title: "P1" })).json<any>();
    const p2 = await (await json("/api/projects", { title: "P2" })).json<any>();
    await json(`/api/projects/${p1.id}/tasks`, { title: "p1 task" });

    // p2's activity does not bleed in from p1.
    const hub2 = await (await req(`/api/projects/${p2.id}`)).json<any>();
    expect(hub2.activity.map((a: any) => a.kind)).toEqual(["project_created"]);

    // Deleting the project cascades its activity rows away.
    await env.DB.prepare("DELETE FROM project WHERE id = ?").bind(p1.id).run();
    const left = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM project_activity WHERE project_id = ?"
    ).bind(p1.id).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});

describe("projects: linked items", () => {
  test("attach heterogeneous items and resolve display fields in the hub", async () => {
    const now = Math.floor(Date.now() / 1000);
    const p = await (await json("/api/projects", { title: "Linking" })).json<any>();

    const doc = await env.DB.prepare(
      "INSERT INTO document (title, body, created_at, updated_at) VALUES ('Spec doc', 'The body of the spec.', ?, ?)"
    ).bind(now, now).run();
    const th = await env.DB.prepare(
      "INSERT INTO thought (body, timestamp, color) VALUES (?, ?, '#abcdef')"
    ).bind("A linked thought\nsecond line", now).run();
    const fr = await env.DB.prepare(
      "INSERT INTO framing (name, description, created_at, updated_at) VALUES ('A framing', 'canvas desc', ?, ?)"
    ).bind(now, now).run();
    await env.DB.prepare(
      "INSERT INTO bookmark (url, title, created_at) VALUES ('https://example.com/x', 'Example', ?)"
    ).bind(now).run();

    const added = await (await json(`/api/projects/${p.id}/items`, {
      item_type: "document", item_id: String(doc.meta.last_row_id), role: "spec",
    })).json<any>();
    expect(added.item_type).toBe("document");
    expect(added.role).toBe("spec");
    expect(added.resolved.title).toBe("Spec doc");
    expect(added.resolved.status).toBe("document");

    await json(`/api/projects/${p.id}/items`, { item_type: "thought", item_id: String(th.meta.last_row_id) });
    await json(`/api/projects/${p.id}/items`, { item_type: "framing", item_id: String(fr.meta.last_row_id) });
    // Bookmarks are linked by URL; OG metadata is pulled from the bookmark table.
    await json(`/api/projects/${p.id}/items`, { item_type: "bookmark", item_id: "https://example.com/x" });

    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.items).toHaveLength(4);
    const byType = Object.fromEntries(hub.items.map((it: any) => [it.item_type, it.resolved]));
    expect(byType.document.title).toBe("Spec doc");
    expect(byType.thought.title).toBe("A linked thought"); // first line only
    expect(byType.thought.color).toBe("#abcdef");
    expect(byType.framing.title).toBe("A framing");
    expect(byType.bookmark.title).toBe("Example");
    expect(byType.bookmark.url).toBe("https://example.com/x");
  });

  test("a bookmark URL with no OG row resolves to the bare URL", async () => {
    const p = await (await json("/api/projects", { title: "Raw URL" })).json<any>();
    await json(`/api/projects/${p.id}/items`, { item_type: "bookmark", item_id: "https://fresh.example.org/page/" });
    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.items[0].resolved.title).toBe("fresh.example.org/page");
    expect(hub.items[0].resolved.url).toBe("https://fresh.example.org/page/");
  });

  test("rejects linking the same item twice (409)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const p = await (await json("/api/projects", { title: "Dup" })).json<any>();
    const doc = await env.DB.prepare(
      "INSERT INTO document (title, body, created_at, updated_at) VALUES ('D', '', ?, ?)"
    ).bind(now, now).run();
    const first = await json(`/api/projects/${p.id}/items`, { item_type: "document", item_id: String(doc.meta.last_row_id) });
    expect(first.status).toBe(201);
    const dup = await json(`/api/projects/${p.id}/items`, { item_type: "document", item_id: String(doc.meta.last_row_id) });
    expect(dup.status).toBe(409);
  });

  test("detach removes the item and is project-scoped", async () => {
    const now = Math.floor(Date.now() / 1000);
    const p1 = await (await json("/api/projects", { title: "Owner" })).json<any>();
    const p2 = await (await json("/api/projects", { title: "Other" })).json<any>();
    const doc = await env.DB.prepare(
      "INSERT INTO document (title, body, created_at, updated_at) VALUES ('Shared', '', ?, ?)"
    ).bind(now, now).run();
    const item = await (await json(`/api/projects/${p1.id}/items`, { item_type: "document", item_id: String(doc.meta.last_row_id) })).json<any>();

    // p2 cannot delete p1's item (project-scoped) → 404, item survives.
    const wrong = await req(`/api/projects/${p2.id}/items/${item.id}`, { method: "DELETE", headers: AUTH });
    expect(wrong.status).toBe(404);
    let hub = await (await req(`/api/projects/${p1.id}`)).json<any>();
    expect(hub.items).toHaveLength(1);

    const del = await req(`/api/projects/${p1.id}/items/${item.id}`, { method: "DELETE", headers: AUTH });
    expect(del.status).toBe(204);
    hub = await (await req(`/api/projects/${p1.id}`)).json<any>();
    expect(hub.items).toHaveLength(0);
  });

  test("a deleted target resolves to null (dangling reference)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const p = await (await json("/api/projects", { title: "Dangle" })).json<any>();
    const doc = await env.DB.prepare(
      "INSERT INTO document (title, body, created_at, updated_at) VALUES ('Doomed', '', ?, ?)"
    ).bind(now, now).run();
    await json(`/api/projects/${p.id}/items`, { item_type: "document", item_id: String(doc.meta.last_row_id) });
    await env.DB.prepare("DELETE FROM document WHERE id = ?").bind(doc.meta.last_row_id).run();

    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.items).toHaveLength(1);
    expect(hub.items[0].resolved).toBeNull();
  });

  test("anonymous viewers don't see private linked documents", async () => {
    const now = Math.floor(Date.now() / 1000);
    const p = await (await json("/api/projects", { title: "Private" })).json<any>();
    const doc = await env.DB.prepare(
      "INSERT INTO document (title, body, private, created_at, updated_at) VALUES ('Secret', '', 1, ?, ?)"
    ).bind(now, now).run();
    await json(`/api/projects/${p.id}/items`, { item_type: "document", item_id: String(doc.meta.last_row_id) });

    // Authed sees it…
    const authedHub = await (await req(`/api/projects/${p.id}`, { headers: AUTH })).json<any>();
    expect(authedHub.items[0].resolved.title).toBe("Secret");
    // …anonymous gets a null payload (row present, content hidden).
    const anonHub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(anonHub.items[0].resolved).toBeNull();
  });

  test("item writes require auth and cascade on project delete", async () => {
    const now = Math.floor(Date.now() / 1000);
    const p = await (await json("/api/projects", { title: "AuthCascade" })).json<any>();
    const doc = await env.DB.prepare(
      "INSERT INTO document (title, body, created_at, updated_at) VALUES ('C', '', ?, ?)"
    ).bind(now, now).run();

    const noAuth = await req(`/api/projects/${p.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_type: "document", item_id: String(doc.meta.last_row_id) }),
    });
    expect(noAuth.status).toBe(401);

    await json(`/api/projects/${p.id}/items`, { item_type: "document", item_id: String(doc.meta.last_row_id) });
    await env.DB.prepare("DELETE FROM project WHERE id = ?").bind(p.id).run();
    const left = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM project_item WHERE project_id = ?"
    ).bind(p.id).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});

describe("projects: attachments", () => {
  function upload(projectId: number, name: string, type: string, bytes = "hello") {
    const fd = new FormData();
    fd.append("file", new File([bytes], name, { type }));
    return req(`/api/projects/${projectId}/attachments`, { method: "POST", headers: AUTH, body: fd });
  }

  test("upload, list in hub, and delete", async () => {
    const p = await (await json("/api/projects", { title: "Files" })).json<any>();
    const up = await upload(p.id, "diagram.png", "image/png");
    expect(up.status).toBe(201);
    const body = await up.json<any>();
    expect(body.attachments).toHaveLength(1);
    const att = body.attachments[0];
    expect(att.attachment_name).toBe("diagram.png");
    expect(att.attachment_key).toContain(`projects/${p.id}/`);

    const hub = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub.attachments).toHaveLength(1);
    expect(hub.attachments[0].id).toBe(att.id);

    // The bytes are retrievable from the attachments route.
    const served = await req(`/api/attachments/${att.attachment_key}`);
    expect(served.status).toBe(200);

    const del = await req(`/api/projects/${p.id}/attachments/${att.id}`, { method: "DELETE", headers: AUTH });
    expect(del.status).toBe(204);
    const hub2 = await (await req(`/api/projects/${p.id}`)).json<any>();
    expect(hub2.attachments).toHaveLength(0);
    // R2 object was reclaimed on delete.
    const gone = await req(`/api/attachments/${att.attachment_key}`);
    expect(gone.status).toBe(404);
  });

  test("upload requires auth and cascades on project delete", async () => {
    const p = await (await json("/api/projects", { title: "FileAuth" })).json<any>();
    const fd = new FormData();
    fd.append("file", new File(["x"], "a.txt", { type: "text/plain" }));
    const noAuth = await req(`/api/projects/${p.id}/attachments`, { method: "POST", body: fd });
    expect(noAuth.status).toBe(401);

    await upload(p.id, "keep.txt", "text/plain");
    await env.DB.prepare("DELETE FROM project WHERE id = ?").bind(p.id).run();
    const left = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM project_attachment WHERE project_id = ?"
    ).bind(p.id).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});
