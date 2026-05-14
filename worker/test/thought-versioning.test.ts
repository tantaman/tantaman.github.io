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

  test("versioning a reply inherits parent_id and supersedes previous", async () => {
    const resParent = await json("/api/thoughts", { body: "rev-parent" });
    const parent = (await resParent.json()) as any;

    const resReply = await json("/api/thoughts", {
      body: "rev-reply-v1",
      parent_id: parent.id,
    });
    const reply = (await resReply.json()) as any;

    const res = await json("/api/thoughts", {
      body: "rev-reply-v2",
      version_of: reply.id,
    });
    expect(res.status).toBe(201);
    const v2 = (await res.json()) as any;

    // v2 inherits parent_id from the original reply and points at the version-root
    expect(v2.parent_id).toBe(parent.id);
    expect(v2.version_of).toBe(reply.id);
    expect(v2.superseded_by).toBeNull();

    // The original reply is now superseded by v2
    const r1Row = await env.DB.prepare(
      "SELECT superseded_by FROM thought WHERE id = ?"
    )
      .bind(reply.id)
      .first<{ superseded_by: number }>();
    expect(r1Row!.superseded_by).toBe(v2.id);
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

    // Fetch feed (use high limit to avoid being pushed out by future-timestamped insertThought rows)
    const feed = await req("/api/thoughts?limit=200", { headers: AUTH });
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

    const feed = await req("/api/thoughts?limit=200", { headers: AUTH });
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

// ---------- GET /thoughts/:id/replies — replies follow version chain ----------

describe("GET /thoughts/:id/replies — replies follow version chain", () => {
  test("replies attached to any version of the parent appear under every version", async () => {
    // Seed: A (root), reply R_on_A on A, B (version_of=A), A.superseded_by=B,
    // R_on_B reply on B.
    const A = await insertThought("vc-parent-A");
    const R_on_A = await insertThought("vc-reply-on-A", { parent_id: A });
    const B = await insertThought("vc-parent-B", { version_of: A });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(B, A)
      .run();
    const R_on_B = await insertThought("vc-reply-on-B", { parent_id: B });

    // GET thread for A: replies include BOTH R_on_A and R_on_B
    const resA = await req(`/api/thoughts/${A}/replies`, { headers: AUTH });
    const bodyA = (await resA.json()) as any;
    const replyIdsA = bodyA.replies.map((r: any) => r.id);
    expect(replyIdsA).toContain(R_on_A);
    expect(replyIdsA).toContain(R_on_B);

    // GET thread for B: same set
    const resB = await req(`/api/thoughts/${B}/replies`, { headers: AUTH });
    const bodyB = (await resB.json()) as any;
    const replyIdsB = bodyB.replies.map((r: any) => r.id);
    expect(replyIdsB).toContain(R_on_A);
    expect(replyIdsB).toContain(R_on_B);
  });

  test("children of any version of an interior reply surface together", async () => {
    // Tree: P -> R1, child C1 of R1, version R2 of R1, child C2 of R2.
    const P = await insertThought("vc-int-P");
    const R1 = await insertThought("vc-int-R1", { parent_id: P });
    const C1 = await insertThought("vc-int-C1", { parent_id: R1 });
    const R2 = await insertThought("vc-int-R2", {
      parent_id: P,
      version_of: R1,
    });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(R2, R1)
      .run();
    const C2 = await insertThought("vc-int-C2", { parent_id: R2 });

    const res = await req(`/api/thoughts/${P}/replies`, { headers: AUTH });
    const body = (await res.json()) as any;
    const ids = body.replies.map((r: any) => r.id);

    // Tree includes R2 (latest version of R) and both children.
    expect(ids).toContain(R2);
    expect(ids).toContain(C1);
    expect(ids).toContain(C2);

    // Superseded R1 is hidden from the tree.
    expect(ids).not.toContain(R1);

    // Both children share the same parent_version_root (= R1, the chain root).
    const c1Row = body.replies.find((r: any) => r.id === C1);
    const c2Row = body.replies.find((r: any) => r.id === C2);
    expect(c1Row.parent_version_root).toBe(R1);
    expect(c2Row.parent_version_root).toBe(R1);
  });

  test("parent reply_count counts across the version chain", async () => {
    // P -> R (one reply). Then edit P -> P2; both endpoints should report 1.
    const P = await insertThought("rc-P");
    await insertThought("rc-R", { parent_id: P });
    const P2 = await insertThought("rc-P2", { version_of: P });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(P2, P)
      .run();

    const resP = await req(`/api/thoughts/${P}/replies`, { headers: AUTH });
    expect((await resP.json() as any).parent.reply_count).toBe(1);

    const resP2 = await req(`/api/thoughts/${P2}/replies`, { headers: AUTH });
    expect((await resP2.json() as any).parent.reply_count).toBe(1);

    // Post a new reply on P2; count goes to 2 from both endpoints.
    await insertThought("rc-R2", { parent_id: P2 });

    const resP_after = await req(`/api/thoughts/${P}/replies`, { headers: AUTH });
    expect((await resP_after.json() as any).parent.reply_count).toBe(2);

    const resP2_after = await req(`/api/thoughts/${P2}/replies`, { headers: AUTH });
    expect((await resP2_after.json() as any).parent.reply_count).toBe(2);
  });

  test("private replies are filtered from version-chain descendants for unauthed callers", async () => {
    const A = await insertThought("pf-A");
    const R_pub = await insertThought("pf-pub", { parent_id: A });
    const B = await insertThought("pf-B", { version_of: A });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(B, A)
      .run();
    // Insert a private reply on B directly
    const privInsert = await env.DB.prepare(
      "INSERT INTO thought (body, timestamp, parent_id, private) VALUES (?, ?, ?, 1)"
    )
      .bind("pf-priv", Date.now() / 1000 + 200_000, B)
      .run();
    const R_priv = privInsert.meta.last_row_id;

    // Authed: both appear
    const authedRes = await req(`/api/thoughts/${A}/replies`, { headers: AUTH });
    const authedIds = ((await authedRes.json()) as any).replies.map((r: any) => r.id);
    expect(authedIds).toContain(R_pub);
    expect(authedIds).toContain(R_priv);

    // Unauthed: only the public one
    const pubRes = await req(`/api/thoughts/${A}/replies`);
    const pubIds = ((await pubRes.json()) as any).replies.map((r: any) => r.id);
    expect(pubIds).toContain(R_pub);
    expect(pubIds).not.toContain(R_priv);
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

  test("delete a versioned reply cascades to its children across versions", async () => {
    // Tree:
    //   P -> R1 (child C1) -> R2 = version_of R1 (child C2)
    // Deleting R2 should remove the whole reply chain plus all child rows.
    const P = await insertThought("dvr-P");
    const R1 = await insertThought("dvr-R1", { parent_id: P });
    const C1 = await insertThought("dvr-C1", { parent_id: R1 });
    const R2 = await insertThought("dvr-R2", { parent_id: P, version_of: R1 });
    await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?")
      .bind(R2, R1)
      .run();
    const C2 = await insertThought("dvr-C2", { parent_id: R2 });

    const res = await req(`/api/thoughts/${R2}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(res.status).toBe(204);

    for (const id of [R1, R2, C1, C2]) {
      const row = await env.DB.prepare("SELECT id FROM thought WHERE id = ?")
        .bind(id)
        .first();
      expect(row).toBeNull();
    }

    // P is untouched
    const pRow = await env.DB.prepare("SELECT id FROM thought WHERE id = ?")
      .bind(P)
      .first();
    expect(pRow).not.toBeNull();
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
