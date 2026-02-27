import { describe, test, expect } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

const AUTH = { Authorization: "Bearer test-secret" };
const JSON_HEADERS = { ...AUTH, "Content-Type": "application/json" };

function req(path: string, init?: RequestInit) {
  return app.request(path, init, env);
}

function json(path: string, body: unknown, method = "POST") {
  return req(path, {
    method,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

let now = Math.floor(Date.now() / 1000) + 100_000; // offset to avoid collisions with other test files
async function insertThought(
  body: string,
  opts?: {
    parent_id?: number;
    version_of?: number;
    superseded_by?: number;
  }
): Promise<number> {
  const r = await env.DB.prepare(
    "INSERT INTO thought (body, timestamp, parent_id, version_of, superseded_by, private) VALUES (?, ?, ?, ?, ?, 0)"
  )
    .bind(
      body,
      now++,
      opts?.parent_id ?? null,
      opts?.version_of ?? null,
      opts?.superseded_by ?? null
    )
    .run();
  return r.meta.last_row_id;
}

// ---------- POST /thoughts — version creation ----------

describe("POST /thoughts — version creation", () => {
  test("create a version of an existing thought", async () => {
    // Create thought A via API
    const resA = await json("/api/thoughts", { body: "Original thought" });
    expect(resA.status).toBe(201);
    const A = (await resA.json()) as any;

    // Create version B of A
    const resB = await json("/api/thoughts", {
      body: "Updated thought",
      version_of: A.id,
    });
    expect(resB.status).toBe(201);
    const B = (await resB.json()) as any;

    // B points to A as root
    expect(B.version_of).toBe(A.id);
    expect(B.superseded_by).toBeNull();

    // A now has superseded_by = B.id
    const aRow = await env.DB.prepare(
      "SELECT superseded_by FROM thought WHERE id = ?"
    )
      .bind(A.id)
      .first<{ superseded_by: number }>();
    expect(aRow!.superseded_by).toBe(B.id);
  });

  test("third version resolves to root", async () => {
    const resA = await json("/api/thoughts", { body: "V1" });
    const A = (await resA.json()) as any;

    const resB = await json("/api/thoughts", {
      body: "V2",
      version_of: A.id,
    });
    const B = (await resB.json()) as any;

    // Create C pointing to B — should resolve to root A
    const resC = await json("/api/thoughts", {
      body: "V3",
      version_of: B.id,
    });
    expect(resC.status).toBe(201);
    const C = (await resC.json()) as any;

    expect(C.version_of).toBe(A.id);

    // B now has superseded_by = C.id
    const bRow = await env.DB.prepare(
      "SELECT superseded_by FROM thought WHERE id = ?"
    )
      .bind(B.id)
      .first<{ superseded_by: number }>();
    expect(bRow!.superseded_by).toBe(C.id);
  });

  test("version_of + parent_id returns 400", async () => {
    const resA = await json("/api/thoughts", { body: "root" });
    const A = (await resA.json()) as any;

    const res = await json("/api/thoughts", {
      body: "bad",
      version_of: A.id,
      parent_id: A.id,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toMatch(/Cannot set both/);
  });

  test("version_of pointing to non-existent thought returns 404", async () => {
    const res = await json("/api/thoughts", {
      body: "orphan",
      version_of: 999999,
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error).toMatch(/not found/i);
  });

  test("version_of pointing to a reply returns 400", async () => {
    const resParent = await json("/api/thoughts", { body: "parent" });
    const parent = (await resParent.json()) as any;

    const resReply = await json("/api/thoughts", {
      body: "reply",
      parent_id: parent.id,
    });
    const reply = (await resReply.json()) as any;

    const res = await json("/api/thoughts", {
      body: "version of reply",
      version_of: reply.id,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toMatch(/Cannot version a reply/);
  });
});

// ---------- GET /thoughts — feed excludes superseded ----------

describe("GET /thoughts — feed excludes superseded", () => {
  test("feed returns latest version, not superseded ones", async () => {
    const resA = await json("/api/thoughts", { body: "feed-test-original" });
    const A = (await resA.json()) as any;

    const resStandalone = await json("/api/thoughts", {
      body: "feed-test-standalone",
    });
    const standalone = (await resStandalone.json()) as any;

    const resB = await json("/api/thoughts", {
      body: "feed-test-updated",
      version_of: A.id,
    });
    const B = (await resB.json()) as any;

    // Fetch feed
    const feed = await req("/api/thoughts", { headers: AUTH });
    const feedBody = (await feed.json()) as any;
    const ids = feedBody.thoughts.map((t: any) => t.id);

    // B (latest) and standalone should be in feed
    expect(ids).toContain(B.id);
    expect(ids).toContain(standalone.id);
    // A (superseded) should NOT be in feed
    expect(ids).not.toContain(A.id);
  });

  test("feed includes version_of and superseded_by fields", async () => {
    const resA = await json("/api/thoughts", {
      body: "feed-fields-original",
    });
    const A = (await resA.json()) as any;

    const resB = await json("/api/thoughts", {
      body: "feed-fields-updated",
      version_of: A.id,
    });
    const B = (await resB.json()) as any;

    const feed = await req("/api/thoughts", { headers: AUTH });
    const feedBody = (await feed.json()) as any;

    const latestInFeed = feedBody.thoughts.find((t: any) => t.id === B.id);
    expect(latestInFeed).toBeDefined();
    expect(latestInFeed.version_of).toBe(A.id);
    expect(latestInFeed.superseded_by).toBeNull();
  });
});

// ---------- GET /thoughts/tags excludes superseded ----------

describe("GET /thoughts/tags excludes superseded", () => {
  test("tags endpoint counts only non-superseded thoughts", async () => {
    // Create A with a unique tag
    const resA = await json("/api/thoughts", {
      body: "tag-test-old #versioned_tag_test",
    });
    const A = (await resA.json()) as any;

    // Create B (version of A) with a different tag
    const resB = await json("/api/thoughts", {
      body: "tag-test-new #versioned_tag_replacement",
      version_of: A.id,
    });
    (await resB.json()) as any;

    const tagsRes = await req("/api/thoughts/tags", { headers: AUTH });
    const tagsBody = (await tagsRes.json()) as any;
    const tagNames = tagsBody.tags.map((t: any) => t.name);

    // The old tag from superseded A should not appear (A is the only thought with it, and it's superseded)
    expect(tagNames).not.toContain("versioned_tag_test");
    // The new tag from B should appear
    expect(tagNames).toContain("versioned_tag_replacement");
  });
});

// ---------- GET /thoughts/:id/replies — version chain ----------

describe("GET /thoughts/:id/replies — version chain", () => {
  test("thread returns versions array for version chain", async () => {
    // Seed A → B → C chain via DB
    const A = await insertThought("chain-A");
    const B = await insertThought("chain-B", { version_of: A });
    // Mark A as superseded by B
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(B, A)
      .run();
    const C = await insertThought("chain-C", { version_of: A });
    // Mark B as superseded by C
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(C, B)
      .run();

    // GET thread for A returns all versions
    const resA = await req(`/api/thoughts/${A}/replies`, { headers: AUTH });
    const bodyA = (await resA.json()) as any;
    expect(bodyA.versions.length).toBe(3);
    expect(bodyA.versions.map((v: any) => v.id)).toEqual([A, B, C]);

    // GET thread for C returns same versions
    const resC = await req(`/api/thoughts/${C}/replies`, { headers: AUTH });
    const bodyC = (await resC.json()) as any;
    expect(bodyC.versions.length).toBe(3);
    expect(bodyC.versions.map((v: any) => v.id)).toEqual([A, B, C]);

    // A shows superseded_by set
    expect(bodyA.parent.superseded_by).toBe(B);

    // C shows superseded_by null
    expect(bodyC.parent.superseded_by).toBeNull();
  });

  test("standalone thought returns empty versions array", async () => {
    const id = await insertThought("standalone-thought");
    const res = await req(`/api/thoughts/${id}/replies`, { headers: AUTH });
    const body = (await res.json()) as any;
    expect(body.versions).toEqual([]);
  });
});

// ---------- GET /thoughts/:id/replies — replies stay on their version ----------

describe("GET /thoughts/:id/replies — replies stay on their version", () => {
  test("replies belong to the version they were posted on", async () => {
    // Seed: A (root), reply R on A, B (version_of=A), A.superseded_by=B
    const A = await insertThought("reply-owner-A");
    const R = await insertThought("reply-on-A", { parent_id: A });
    const B = await insertThought("reply-owner-B", { version_of: A });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(B, A)
      .run();

    // GET thread for A: replies include R
    const resA = await req(`/api/thoughts/${A}/replies`, { headers: AUTH });
    const bodyA = (await resA.json()) as any;
    const replyIdsA = bodyA.replies.map((r: any) => r.id);
    expect(replyIdsA).toContain(R);

    // GET thread for B: replies do NOT include R
    const resB = await req(`/api/thoughts/${B}/replies`, { headers: AUTH });
    const bodyB = (await resB.json()) as any;
    const replyIdsB = bodyB.replies.map((r: any) => r.id);
    expect(replyIdsB).not.toContain(R);
  });
});

// ---------- DELETE /thoughts/:id — deletes entire version chain ----------

describe("DELETE /thoughts/:id — deletes entire version chain", () => {
  test("delete from latest deletes entire chain and replies", async () => {
    const A = await insertThought("del-chain-A");
    const R = await insertThought("del-reply-on-A", { parent_id: A });
    const B = await insertThought("del-chain-B", { version_of: A });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(B, A)
      .run();

    // Delete B (latest version)
    const res = await req(`/api/thoughts/${B}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(res.status).toBe(204);

    // A, B, and R should all be gone
    for (const id of [A, B, R]) {
      const row = await env.DB.prepare(
        "SELECT id FROM thought WHERE id = ?"
      )
        .bind(id)
        .first();
      expect(row).toBeNull();
    }
  });

  test("delete from root deletes entire chain", async () => {
    const A = await insertThought("del-root-A");
    const B = await insertThought("del-root-B", { version_of: A });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(B, A)
      .run();
    const C = await insertThought("del-root-C", { version_of: A });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(C, B)
      .run();

    // Delete A (root)
    const res = await req(`/api/thoughts/${A}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(res.status).toBe(204);

    // All gone
    for (const id of [A, B, C]) {
      const row = await env.DB.prepare(
        "SELECT id FROM thought WHERE id = ?"
      )
        .bind(id)
        .first();
      expect(row).toBeNull();
    }
  });
});
