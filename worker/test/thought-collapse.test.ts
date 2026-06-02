import { describe, test, expect, beforeAll } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

// Verifies migration 0051 (one-time collapse of legacy version chains into the
// stable-row model). We seed old-format chains directly using the still-present
// version_of / superseded_by columns, then replay 0051's statements and assert
// the resulting stable-row shape.

const AUTH = { Authorization: "Bearer test-secret" };

let ts = 2_000_000_000;
async function seedThought(
  body: string,
  opts: { parent_id?: number; version_of?: number; superseded_by?: number; private?: boolean } = {},
): Promise<number> {
  const t = ts++;
  const r = await env.DB.prepare(
    "INSERT INTO thought (body, timestamp, updated_at, parent_id, version_of, superseded_by, private, version) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
  )
    .bind(body, t, t, opts.parent_id ?? null, opts.version_of ?? null, opts.superseded_by ?? null, opts.private ? 1 : 0)
    .run();
  return r.meta.last_row_id as number;
}

async function runCollapseMigration() {
  const migrations = (env as unknown as { TEST_MIGRATIONS: { name: string; queries: string[] }[] }).TEST_MIGRATIONS;
  const collapse = migrations.find((m) => m.name.startsWith("0051"));
  if (!collapse) throw new Error("0051 migration not found in TEST_MIGRATIONS");
  for (const q of collapse.queries) {
    const sql = q.trim();
    if (!sql) continue;
    await env.DB.prepare(sql).run();
  }
}

// Captured ids
let A = 0, B = 0, C = 0; // chain A->B->C, survivor C
let X = 0;               // standalone, linked to the chain
let R_onA = 0, R_onC = 0; // replies
let framingId = 0;

beforeAll(async () => {
  // Chain A -> B -> C (C is the latest/survivor).
  A = await seedThought("chain-A #atag");
  B = await seedThought("chain-B #btag", { version_of: A });
  await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?").bind(B, A).run();
  C = await seedThought("chain-C #ctag", { version_of: A });
  await env.DB.prepare("UPDATE thought SET superseded_by = ? WHERE id = ?").bind(C, B).run();

  // A standalone thought linked to the chain in both directions.
  X = await seedThought("standalone-X");

  // Replies: one authored on the root (A), one on the latest (C).
  R_onA = await seedThought("reply-on-A", { parent_id: A });
  R_onC = await seedThought("reply-on-C", { parent_id: C });

  // Attachment on the root A (should migrate to survivor C).
  await env.DB.prepare(
    "INSERT INTO thought_attachment (thought_id, attachment_key, attachment_type, attachment_name) VALUES (?, ?, ?, ?)"
  ).bind(A, `thoughts/${A}/pic.png`, "image/png", "pic.png").run();

  // Tags: seed thought_tag rows for each version (atag/btag/ctag).
  for (const [tid, name] of [[A, "atag"], [B, "btag"], [C, "ctag"]] as [number, string][]) {
    await env.DB.prepare("INSERT OR IGNORE INTO tag (name) VALUES (?)").bind(name).run();
    const tag = await env.DB.prepare("SELECT id FROM tag WHERE name = ?").bind(name).first<{ id: number }>();
    await env.DB.prepare("INSERT INTO thought_tag (thought_id, tag_id) VALUES (?, ?)").bind(tid, tag!.id).run();
  }

  // A task extracted from a dead version (A) — should be dropped on collapse.
  await env.DB.prepare(
    "INSERT INTO task (thought_id, title, created_at) VALUES (?, ?, ?)"
  ).bind(A, "old task", ts).run();

  // Edges: A -> X (outbound from dead) and X -> B (inbound to dead).
  await env.DB.prepare("INSERT INTO thought_edge (source_id, target_id) VALUES (?, ?)").bind(A, X).run();
  await env.DB.prepare("INSERT INTO thought_edge (source_id, target_id) VALUES (?, ?)").bind(X, B).run();

  // Framing node referencing the dead version B (should re-point to C).
  const fr = await env.DB.prepare(
    "INSERT INTO framing (name, created_at, updated_at) VALUES ('test', ?, ?)"
  ).bind(ts, ts).run();
  framingId = fr.meta.last_row_id as number;
  await env.DB.prepare(
    "INSERT INTO framing_node (framing_id, node_type, item_id, x, y) VALUES (?, 'thought', ?, 0, 0)"
  ).bind(framingId, String(B)).run();

  await runCollapseMigration();
});

describe("0051 collapse — chain structure", () => {
  test("dead versions are deleted, survivor remains", async () => {
    for (const id of [A, B]) {
      const row = await env.DB.prepare("SELECT id FROM thought WHERE id = ?").bind(id).first();
      expect(row).toBeNull();
    }
    const c = await env.DB.prepare("SELECT id, body, version, timestamp, version_of, superseded_by FROM thought WHERE id = ?")
      .bind(C).first<any>();
    expect(c).not.toBeNull();
    expect(c.body).toBe("chain-C #ctag");
    expect(c.version).toBe(3);
    expect(c.version_of).toBeNull();
    expect(c.superseded_by).toBeNull();
  });

  test("survivor's creation time is restored to the root's", async () => {
    const c = await env.DB.prepare("SELECT timestamp, updated_at FROM thought WHERE id = ?").bind(C).first<any>();
    // Root A was seeded first with the smallest timestamp.
    expect(c.timestamp).toBe(2_000_000_000);
    // updated_at stays the survivor's own (later) write time → marks it edited.
    expect(c.updated_at).toBeGreaterThan(c.timestamp);
  });

  test("prior bodies are snapshotted into history", async () => {
    const hist = await env.DB.prepare(
      "SELECT version, body FROM thought_history WHERE thought_id = ? ORDER BY version"
    ).bind(C).all<{ version: number; body: string }>();
    expect(hist.results).toEqual([
      { version: 1, body: "chain-A #atag" },
      { version: 2, body: "chain-B #btag" },
    ]);
  });
});

describe("0051 collapse — reference re-pointing", () => {
  test("replies authored on any version now point at the survivor", async () => {
    const r1 = await env.DB.prepare("SELECT parent_id FROM thought WHERE id = ?").bind(R_onA).first<any>();
    const r2 = await env.DB.prepare("SELECT parent_id FROM thought WHERE id = ?").bind(R_onC).first<any>();
    expect(r1.parent_id).toBe(C);
    expect(r2.parent_id).toBe(C);
  });

  test("attachments migrate to the survivor", async () => {
    const att = await env.DB.prepare("SELECT thought_id FROM thought_attachment WHERE attachment_key = ?")
      .bind(`thoughts/${A}/pic.png`).first<any>();
    expect(att.thought_id).toBe(C);
  });

  test("edges are re-pointed on both endpoints", async () => {
    const out = await env.DB.prepare("SELECT 1 FROM thought_edge WHERE source_id = ? AND target_id = ?").bind(C, X).first();
    const inb = await env.DB.prepare("SELECT 1 FROM thought_edge WHERE source_id = ? AND target_id = ?").bind(X, C).first();
    expect(out).not.toBeNull();
    expect(inb).not.toBeNull();
    // No edges still reference the deleted ids.
    const dangling = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM thought_edge WHERE source_id IN (?, ?) OR target_id IN (?, ?)"
    ).bind(A, B, A, B).first<{ n: number }>();
    expect(dangling!.n).toBe(0);
  });

  test("framing nodes re-point to the survivor", async () => {
    const node = await env.DB.prepare(
      "SELECT item_id FROM framing_node WHERE framing_id = ? AND node_type = 'thought'"
    ).bind(framingId).first<any>();
    expect(node.item_id).toBe(String(C));
  });
});

describe("0051 collapse — extractions and tags", () => {
  test("dead-version extractions (tasks) are dropped", async () => {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM task WHERE thought_id = ?").bind(A).first<{ n: number }>();
    expect(n!.n).toBe(0);
  });

  test("only the survivor's tags remain; orphan tags are GC'd", async () => {
    const tags = await env.DB.prepare(
      `SELECT t.name FROM tag t JOIN thought_tag tt ON tt.tag_id = t.id WHERE tt.thought_id = ?`
    ).bind(C).all<{ name: string }>();
    expect(tags.results.map((t) => t.name)).toEqual(["ctag"]);

    const orphan = await env.DB.prepare("SELECT id FROM tag WHERE name IN ('atag', 'btag')").all();
    expect(orphan.results.length).toBe(0);
  });
});

describe("0051 collapse — end to end via API", () => {
  test("the collapsed thought serves its full version timeline", async () => {
    const res = await app.request(`/api/thoughts/${C}/replies`, { headers: AUTH }, env);
    const body = (await res.json()) as any;
    expect(body.parent.version).toBe(3);
    expect(body.versions.map((v: any) => v.version)).toEqual([1, 2, 3]);
    // Both replies surface under the survivor.
    const ids = body.replies.map((r: any) => r.id);
    expect(ids).toContain(R_onA);
    expect(ids).toContain(R_onC);

    const hist = await app.request(`/api/thoughts/${C}/history`, { headers: AUTH }, env);
    const hbody = (await hist.json()) as any;
    expect(hbody.versions.map((v: any) => v.body)).toEqual([
      "chain-A #atag",
      "chain-B #btag",
      "chain-C #ctag",
    ]);
  });
});
