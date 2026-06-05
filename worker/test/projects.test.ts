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
