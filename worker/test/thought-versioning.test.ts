import { describe, test, expect } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

const AUTH = { Authorization: "Bearer test-secret" };
const JSON_HEADERS = { ...AUTH, "Content-Type": "application/json" };

function req(path: string, init?: RequestInit) {
  return app.request(path, init, env);
}

function send(path: string, body: unknown, method = "POST") {
  return req(path, {
    method,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

async function createThought(body: string, opts?: { parent_id?: number; private?: boolean }) {
  const res = await send("/api/thoughts", { body, ...opts });
  expect(res.status).toBe(201);
  return (await res.json()) as any;
}

// Seed a thought row directly (stable-row model: version defaults to 1).
let seedTs = Math.floor(Date.now() / 1000) + 100_000; // offset to avoid feed collisions
async function insertThought(
  body: string,
  opts?: { parent_id?: number; private?: boolean }
): Promise<number> {
  const ts = seedTs++;
  const r = await env.DB.prepare(
    "INSERT INTO thought (body, timestamp, updated_at, parent_id, private, version) VALUES (?, ?, ?, ?, ?, 1)"
  )
    .bind(body, ts, ts, opts?.parent_id ?? null, opts?.private ? 1 : 0)
    .run();
  return r.meta.last_row_id as number;
}

// ---------- PATCH /thoughts/:id — in-place edit + history snapshot ----------

describe("PATCH /thoughts/:id — edit snapshots history", () => {
  test("editing keeps the same id, bumps version, snapshots the old body", async () => {
    const A = await createThought("Original thought");

    const res = await send(`/api/thoughts/${A.id}`, { body: "Updated thought" }, "PATCH");
    expect(res.status).toBe(200);
    const edited = (await res.json()) as any;

    // Stable id, body updated, version bumped, creation time preserved.
    expect(edited.id).toBe(A.id);
    expect(edited.body).toBe("Updated thought");
    expect(edited.version).toBe(2);
    expect(edited.timestamp).toBe(A.timestamp);
    expect(edited.updated_at).toBeGreaterThanOrEqual(A.timestamp);

    // The live row holds the new body at version 2.
    const row = await env.DB.prepare("SELECT body, version FROM thought WHERE id = ?")
      .bind(A.id)
      .first<{ body: string; version: number }>();
    expect(row!.body).toBe("Updated thought");
    expect(row!.version).toBe(2);

    // The prior body is snapshotted into thought_history at version 1.
    const hist = await env.DB.prepare(
      "SELECT version, body FROM thought_history WHERE thought_id = ? ORDER BY version"
    ).bind(A.id).all<{ version: number; body: string }>();
    expect(hist.results).toEqual([{ version: 1, body: "Original thought" }]);
  });

  test("a third edit accumulates two history rows", async () => {
    const A = await createThought("V1");
    await send(`/api/thoughts/${A.id}`, { body: "V2" }, "PATCH");
    const res = await send(`/api/thoughts/${A.id}`, { body: "V3" }, "PATCH");
    const v3 = (await res.json()) as any;
    expect(v3.version).toBe(3);

    const hist = await env.DB.prepare(
      "SELECT version, body FROM thought_history WHERE thought_id = ? ORDER BY version"
    ).bind(A.id).all<{ version: number; body: string }>();
    expect(hist.results).toEqual([
      { version: 1, body: "V1" },
      { version: 2, body: "V2" },
    ]);
  });

  test("editing with an unchanged body is a no-op (no version bump, no history)", async () => {
    const A = await createThought("Same body");
    const res = await send(`/api/thoughts/${A.id}`, { body: "Same body" }, "PATCH");
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.version).toBe(1);

    const hist = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM thought_history WHERE thought_id = ?"
    ).bind(A.id).first<{ n: number }>();
    expect(hist!.n).toBe(0);
  });

  test("editing re-derives #hashtags but leaves structured extractions (tasks) intact", async () => {
    const A = await createThought("#t finish the migration\n#keep_tag stuff");

    // A task was extracted on create.
    const before = await env.DB.prepare("SELECT COUNT(*) AS n FROM task WHERE thought_id = ?")
      .bind(A.id).first<{ n: number }>();
    expect(before!.n).toBe(1);

    // Edit: drop the #t line and swap the tag.
    await send(`/api/thoughts/${A.id}`, { body: "#new_tag rewritten" }, "PATCH");

    // Tags reflect the new body only.
    const tagsRes = await req("/api/thoughts/tags", { headers: AUTH });
    const tagNames = ((await tagsRes.json()) as any).tags.map((t: any) => t.name);
    expect(tagNames).toContain("new_tag");
    expect(tagNames).not.toContain("keep_tag");

    // The task is untouched (state preserved) even though the #t line is gone.
    const after = await env.DB.prepare("SELECT COUNT(*) AS n FROM task WHERE thought_id = ?")
      .bind(A.id).first<{ n: number }>();
    expect(after!.n).toBe(1);
  });

  test("a privacy toggle does not create a new version", async () => {
    const A = await createThought("toggle me");
    const res = await send(`/api/thoughts/${A.id}`, { private: true }, "PATCH");
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;
    expect(out.private).toBe(1);
    expect(out.version).toBe(1);

    const hist = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM thought_history WHERE thought_id = ?"
    ).bind(A.id).first<{ n: number }>();
    expect(hist!.n).toBe(0);
  });

  test("PATCH requires auth", async () => {
    const A = await createThought("guard me");
    const res = await req(`/api/thoughts/${A.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "nope" }),
    });
    expect(res.status).toBe(401);
  });

  test("PATCH on a missing thought 404s", async () => {
    const res = await send(`/api/thoughts/999999`, { body: "ghost" }, "PATCH");
    expect(res.status).toBe(404);
  });
});

// ---------- GET /thoughts/:id/history ----------

describe("GET /thoughts/:id/history", () => {
  test("returns prior versions plus the current body, oldest-first", async () => {
    const A = await createThought("h-v1");
    await send(`/api/thoughts/${A.id}`, { body: "h-v2" }, "PATCH");
    await send(`/api/thoughts/${A.id}`, { body: "h-v3" }, "PATCH");

    const res = await req(`/api/thoughts/${A.id}/history`, { headers: AUTH });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.versions.map((v: any) => [v.version, v.body])).toEqual([
      [1, "h-v1"],
      [2, "h-v2"],
      [3, "h-v3"],
    ]);
  });

  test("a never-edited thought reports a single version", async () => {
    const A = await createThought("solo");
    const res = await req(`/api/thoughts/${A.id}/history`, { headers: AUTH });
    const body = (await res.json()) as any;
    expect(body.versions).toEqual([
      expect.objectContaining({ version: 1, body: "solo" }),
    ]);
  });

  test("private thought history is hidden from unauthed callers", async () => {
    const A = await createThought("secret", { private: true });
    await send(`/api/thoughts/${A.id}`, { body: "secret v2" }, "PATCH");

    const authed = await req(`/api/thoughts/${A.id}/history`, { headers: AUTH });
    expect(authed.status).toBe(200);

    const pub = await req(`/api/thoughts/${A.id}/history`);
    expect(pub.status).toBe(404);
  });
});

// ---------- POST /thoughts/:id/revert ----------

describe("POST /thoughts/:id/revert", () => {
  test("reverting re-applies an old body as a new version", async () => {
    const A = await createThought("r-v1");
    await send(`/api/thoughts/${A.id}`, { body: "r-v2" }, "PATCH");
    await send(`/api/thoughts/${A.id}`, { body: "r-v3" }, "PATCH"); // version 3 now

    const res = await send(`/api/thoughts/${A.id}/revert`, { version: 1 });
    expect(res.status).toBe(200);
    const out = (await res.json()) as any;

    // Same id, original body restored, version advanced to 4.
    expect(out.id).toBe(A.id);
    expect(out.body).toBe("r-v1");
    expect(out.version).toBe(4);

    // History now contains v1, v2, v3; the just-superseded v3 was snapshotted.
    const res2 = await req(`/api/thoughts/${A.id}/history`, { headers: AUTH });
    const body = (await res2.json()) as any;
    expect(body.versions.map((v: any) => v.body)).toEqual(["r-v1", "r-v2", "r-v3", "r-v1"]);
  });

  test("reverting to a non-existent version 404s", async () => {
    const A = await createThought("only-one");
    const res = await send(`/api/thoughts/${A.id}/revert`, { version: 7 });
    expect(res.status).toBe(404);
  });

  test("revert requires auth", async () => {
    const A = await createThought("revert-guard");
    await send(`/api/thoughts/${A.id}`, { body: "v2" }, "PATCH");
    const res = await req(`/api/thoughts/${A.id}/revert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1 }),
    });
    expect(res.status).toBe(401);
  });
});

// ---------- GET /thoughts — feed shows edited thought in place ----------

describe("GET /thoughts — feed reflects edits in place", () => {
  test("an edited thought appears once with its latest body", async () => {
    const A = await createThought("feed-original");
    await send(`/api/thoughts/${A.id}`, { body: "feed-edited" }, "PATCH");

    const feed = await req("/api/thoughts?limit=200", { headers: AUTH });
    const thoughts = ((await feed.json()) as any).thoughts as any[];

    const matches = thoughts.filter((t) => t.id === A.id);
    expect(matches.length).toBe(1);
    expect(matches[0].body).toBe("feed-edited");
    expect(matches[0].version).toBe(2);
  });
});

// ---------- GET /thoughts/:id/replies — stable replies + version indicator ----------

describe("GET /thoughts/:id/replies — stable model", () => {
  test("thread exposes the version timeline and current version", async () => {
    const A = await createThought("thread-v1");
    await send(`/api/thoughts/${A.id}`, { body: "thread-v2" }, "PATCH");
    await send(`/api/thoughts/${A.id}`, { body: "thread-v3" }, "PATCH");

    const res = await req(`/api/thoughts/${A.id}/replies`, { headers: AUTH });
    const body = (await res.json()) as any;
    expect(body.parent.version).toBe(3);
    expect(body.versions.map((v: any) => v.version)).toEqual([1, 2, 3]);
  });

  test("an un-edited thought returns an empty versions array", async () => {
    const A = await createThought("no-edits");
    const res = await req(`/api/thoughts/${A.id}/replies`, { headers: AUTH });
    const body = (await res.json()) as any;
    expect(body.versions).toEqual([]);
  });

  test("editing a parent keeps its replies attached", async () => {
    const P = await createThought("reply-parent-v1");
    const R = await createThought("a reply", { parent_id: P.id });

    await send(`/api/thoughts/${P.id}`, { body: "reply-parent-v2" }, "PATCH");

    const res = await req(`/api/thoughts/${P.id}/replies`, { headers: AUTH });
    const body = (await res.json()) as any;
    expect(body.replies.map((r: any) => r.id)).toContain(R.id);
    expect(body.parent.reply_count).toBe(1);
  });

  test("editing a reply keeps the same id and parent", async () => {
    const P = await createThought("rp");
    const R = await createThought("reply-v1", { parent_id: P.id });

    const res = await send(`/api/thoughts/${R.id}`, { body: "reply-v2" }, "PATCH");
    const edited = (await res.json()) as any;
    expect(edited.id).toBe(R.id);
    expect(edited.parent_id).toBe(P.id);
    expect(edited.version).toBe(2);

    const thread = await req(`/api/thoughts/${P.id}/replies`, { headers: AUTH });
    const body = (await thread.json()) as any;
    const reply = body.replies.find((r: any) => r.id === R.id);
    expect(reply.body).toBe("reply-v2");
  });

  test("private replies are filtered for unauthed callers", async () => {
    const A = await insertThought("pf-A");
    const R_pub = await insertThought("pf-pub", { parent_id: A });
    const R_priv = await insertThought("pf-priv", { parent_id: A, private: true });

    const authedRes = await req(`/api/thoughts/${A}/replies`, { headers: AUTH });
    const authedIds = ((await authedRes.json()) as any).replies.map((r: any) => r.id);
    expect(authedIds).toContain(R_pub);
    expect(authedIds).toContain(R_priv);

    const pubRes = await req(`/api/thoughts/${A}/replies`);
    const pubIds = ((await pubRes.json()) as any).replies.map((r: any) => r.id);
    expect(pubIds).toContain(R_pub);
    expect(pubIds).not.toContain(R_priv);
  });
});

// ---------- DELETE /thoughts/:id — cascades replies + history ----------

describe("DELETE /thoughts/:id", () => {
  test("deletes the thought, its replies, and its history snapshots", async () => {
    const A = await createThought("del-original");
    await send(`/api/thoughts/${A.id}`, { body: "del-edited" }, "PATCH"); // creates a history row
    const R = await createThought("del-reply", { parent_id: A.id });
    const C = await createThought("del-grandchild", { parent_id: R.id });

    const res = await req(`/api/thoughts/${A.id}`, { method: "DELETE", headers: AUTH });
    expect(res.status).toBe(204);

    for (const id of [A.id, R.id, C.id]) {
      const row = await env.DB.prepare("SELECT id FROM thought WHERE id = ?").bind(id).first();
      expect(row).toBeNull();
    }

    const hist = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM thought_history WHERE thought_id = ?"
    ).bind(A.id).first<{ n: number }>();
    expect(hist!.n).toBe(0);
  });

  test("deleting a reply leaves its parent intact", async () => {
    const P = await createThought("keep-me");
    const R = await createThought("remove-me", { parent_id: P.id });

    const res = await req(`/api/thoughts/${R.id}`, { method: "DELETE", headers: AUTH });
    expect(res.status).toBe(204);

    const rRow = await env.DB.prepare("SELECT id FROM thought WHERE id = ?").bind(R.id).first();
    expect(rRow).toBeNull();
    const pRow = await env.DB.prepare("SELECT id FROM thought WHERE id = ?").bind(P.id).first();
    expect(pRow).not.toBeNull();
  });
});
