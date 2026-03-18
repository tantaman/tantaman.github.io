import { describe, test, expect } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

const AUTH = { Authorization: "Bearer test-secret" };

function req(path: string, init?: RequestInit) {
  return app.request(path, init, env);
}

let now = Math.floor(Date.now() / 1000) + 200_000; // offset to avoid collisions
async function insertThought(
  body: string,
  opts?: { parent_id?: number; private?: number }
): Promise<number> {
  const r = await env.DB.prepare(
    "INSERT INTO thought (body, timestamp, parent_id, private) VALUES (?, ?, ?, ?)"
  )
    .bind(body, now++, opts?.parent_id ?? null, opts?.private ?? 0)
    .run();
  return r.meta.last_row_id;
}

async function insertAttachment(
  thoughtId: number,
  key: string,
  type = "image/png",
  name = "file.png"
) {
  await env.DB.prepare(
    "INSERT INTO thought_attachment (thought_id, attachment_key, attachment_type, attachment_name) VALUES (?, ?, ?, ?)"
  )
    .bind(thoughtId, key, type, name)
    .run();
}

// ---------- GET /thoughts/graph — large dataset ----------

describe("GET /thoughts/graph — handles 1000+ thoughts", () => {
  test("returns all thoughts without SQL variable limit error", async () => {
    // Insert 1050 top-level thoughts
    const count = 1050;
    const stmts = [];
    for (let i = 0; i < count; i++) {
      stmts.push(
        env.DB.prepare(
          "INSERT INTO thought (body, timestamp, private) VALUES (?, ?, 0)"
        ).bind(`graph-thought-${i}`, now++)
      );
    }
    // Batch in chunks of 100 (D1 batch limit)
    for (let i = 0; i < stmts.length; i += 100) {
      await env.DB.batch(stmts.slice(i, i + 100));
    }

    const res = await req("/api/thoughts/graph", { headers: AUTH });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    // Should have at least our 1050 (plus any from other tests)
    expect(data.thoughts.length).toBeGreaterThanOrEqual(count);
  });
});

// ---------- GET /thoughts/:id/replies — attachments via JOIN ----------

describe("GET /thoughts/:id/replies — attachments", () => {
  test("returns replies with their attachments", async () => {
    const parent = await insertThought("parent-with-replies");
    const reply1 = await insertThought("reply-1", { parent_id: parent });
    const reply2 = await insertThought("reply-2", { parent_id: parent });

    await insertAttachment(reply1, "r1-file1.png");
    await insertAttachment(reply1, "r1-file2.jpg", "image/jpeg", "photo.jpg");
    await insertAttachment(reply2, "r2-file1.pdf", "application/pdf", "doc.pdf");

    const res = await req(`/api/thoughts/${parent}/replies`, {
      headers: AUTH,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;

    const r1 = data.replies.find((r: any) => r.id === reply1);
    expect(r1).toBeDefined();
    expect(r1.attachments).toHaveLength(2);
    expect(r1.attachments.map((a: any) => a.key).sort()).toEqual([
      "r1-file1.png",
      "r1-file2.jpg",
    ]);

    const r2 = data.replies.find((r: any) => r.id === reply2);
    expect(r2).toBeDefined();
    expect(r2.attachments).toHaveLength(1);
    expect(r2.attachments[0].key).toBe("r2-file1.pdf");
  });

  test("replies with no attachments have empty array", async () => {
    const parent = await insertThought("parent-no-attach");
    await insertThought("reply-no-attach", { parent_id: parent });

    const res = await req(`/api/thoughts/${parent}/replies`, {
      headers: AUTH,
    });
    const data = (await res.json()) as any;
    expect(data.replies[0].attachments).toEqual([]);
  });

  test("handles many nested replies without SQL variable limit", async () => {
    const parent = await insertThought("deep-parent");
    // Create 1050 direct replies
    const stmts = [];
    for (let i = 0; i < 1050; i++) {
      stmts.push(
        env.DB.prepare(
          "INSERT INTO thought (body, timestamp, parent_id, private) VALUES (?, ?, ?, 0)"
        ).bind(`deep-reply-${i}`, now++, parent)
      );
    }
    for (let i = 0; i < stmts.length; i += 100) {
      await env.DB.batch(stmts.slice(i, i + 100));
    }

    const res = await req(`/api/thoughts/${parent}/replies`, {
      headers: AUTH,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.replies.length).toBeGreaterThanOrEqual(1050);
  });
});

// ---------- DELETE /thoughts/:id — cascade with attachments ----------

describe("DELETE /thoughts/:id — cascade cleanup", () => {
  test("deletes thought with replies and cleans up attachments", async () => {
    const parent = await insertThought("del-parent");
    const child = await insertThought("del-child", { parent_id: parent });
    const grandchild = await insertThought("del-grandchild", {
      parent_id: child,
    });

    await insertAttachment(parent, "del-p.png");
    await insertAttachment(child, "del-c.png");
    await insertAttachment(grandchild, "del-gc.png");

    const res = await req(`/api/thoughts/${parent}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(res.status).toBe(204);

    // All thoughts should be gone
    for (const id of [parent, child, grandchild]) {
      const row = await env.DB.prepare(
        "SELECT id FROM thought WHERE id = ?"
      )
        .bind(id)
        .first();
      expect(row).toBeNull();
    }

    // All attachments should be gone (cascade)
    for (const id of [parent, child, grandchild]) {
      const att = await env.DB.prepare(
        "SELECT thought_id FROM thought_attachment WHERE thought_id = ?"
      )
        .bind(id)
        .first();
      expect(att).toBeNull();
    }
  });
});
