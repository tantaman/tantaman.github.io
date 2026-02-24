import { describe, test, expect, beforeAll } from "vitest";
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

// Seed thoughts directly in DB (avoids POST /api/thoughts which needs AI/Vectorize)
let thoughtA: number;
let thoughtB: number;
let thoughtC: number;

beforeAll(async () => {
  const now = Math.floor(Date.now() / 1000);
  const insert = (body: string) =>
    env.DB.prepare("INSERT INTO thought (body, timestamp) VALUES (?, ?)").bind(
      body,
      now
    );
  const a = await insert("Thought A").run();
  const b = await insert("Thought B").run();
  const c = await insert("Thought C").run();
  thoughtA = a.meta.last_row_id;
  thoughtB = b.meta.last_row_id;
  thoughtC = c.meta.last_row_id;
});

// ---------- Auth ----------

describe("auth", () => {
  test("rejects missing auth", async () => {
    const res = await req("/api/framings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });
    expect(res.status).toBe(401);
  });

  test("rejects wrong token", async () => {
    const res = await req("/api/framings", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "x" }),
    });
    expect(res.status).toBe(401);
  });
});

// ---------- Framing CRUD ----------

describe("framing CRUD", () => {
  test("create + list", async () => {
    const create = await json("/api/framings", {
      name: "My Board",
      description: "A test board",
    });
    expect(create.status).toBe(201);
    const body = (await create.json()) as any;
    expect(body.name).toBe("My Board");
    expect(body.description).toBe("A test board");
    expect(body.id).toBeGreaterThan(0);

    const list = await req("/api/framings");
    const listBody = (await list.json()) as any;
    expect(listBody.framings.length).toBeGreaterThanOrEqual(1);
    expect(listBody.framings.some((f: any) => f.id === body.id)).toBe(true);
  });

  test("empty name returns 400", async () => {
    const res = await json("/api/framings", { name: "  " });
    expect(res.status).toBe(400);
  });

  test("get by id returns full graph with thought body", async () => {
    // Create framing
    const create = await json("/api/framings", { name: "Graph Board" });
    const framing = (await create.json()) as any;

    // Place a thought
    await json(`/api/framings/${framing.id}/thoughts`, {
      thought_id: thoughtA,
      x: 10,
      y: 20,
    });

    const get = await req(`/api/framings/${framing.id}`);
    const body = (await get.json()) as any;
    expect(body.framing.id).toBe(framing.id);
    expect(body.thoughts.length).toBe(1);
    expect(body.thoughts[0].thought_id).toBe(thoughtA);
    expect(body.thoughts[0].body).toBe("Thought A");
    expect(body.edges).toEqual([]);
  });

  test("get missing framing returns 404", async () => {
    const res = await req("/api/framings/99999");
    expect(res.status).toBe(404);
  });

  test("patch name and description", async () => {
    const create = await json("/api/framings", { name: "Old Name" });
    const framing = (await create.json()) as any;

    const patch = await req(`/api/framings/${framing.id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: "New Name", description: "Updated" }),
    });
    expect(patch.status).toBe(200);
    const body = (await patch.json()) as any;
    expect(body.name).toBe("New Name");
    expect(body.description).toBe("Updated");
  });

  test("delete + verify gone", async () => {
    const create = await json("/api/framings", { name: "To Delete" });
    const framing = (await create.json()) as any;

    const del = await req(`/api/framings/${framing.id}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(del.status).toBe(204);

    const get = await req(`/api/framings/${framing.id}`);
    expect(get.status).toBe(404);
  });
});

// ---------- Placements ----------

describe("placements", () => {
  let framingId: number;

  beforeAll(async () => {
    const res = await json("/api/framings", { name: "Placement Board" });
    const body = (await res.json()) as any;
    framingId = body.id;
  });

  test("place thought with x/y/w/h", async () => {
    const res = await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtA,
      x: 100,
      y: 200,
      w: 300,
      h: 150,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.x).toBe(100);
    expect(body.y).toBe(200);
    expect(body.w).toBe(300);
    expect(body.h).toBe(150);
  });

  test("missing required fields returns 400", async () => {
    const res = await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtB,
    });
    expect(res.status).toBe(400);
  });

  test("framing 404", async () => {
    const res = await json("/api/framings/99999/thoughts", {
      thought_id: thoughtA,
      x: 0,
      y: 0,
    });
    expect(res.status).toBe(404);
  });

  test("duplicate placement returns 409", async () => {
    const res = await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtA,
      x: 0,
      y: 0,
    });
    expect(res.status).toBe(409);
  });

  test("update position", async () => {
    const res = await req(
      `/api/framings/${framingId}/thoughts/${thoughtA}`,
      {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ x: 999, y: 888 }),
      }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.x).toBe(999);
    expect(body.y).toBe(888);
  });

  test("remove thought + verify gone", async () => {
    // Place B first
    await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtB,
      x: 0,
      y: 0,
    });

    const del = await req(
      `/api/framings/${framingId}/thoughts/${thoughtB}`,
      { method: "DELETE", headers: AUTH }
    );
    expect(del.status).toBe(204);

    // Verify it's gone via GET framing
    const get = await req(`/api/framings/${framingId}`);
    const body = (await get.json()) as any;
    expect(
      body.thoughts.find((t: any) => t.thought_id === thoughtB)
    ).toBeUndefined();
  });
});

// ---------- Edges ----------

describe("edges", () => {
  let framingId: number;

  beforeAll(async () => {
    const res = await json("/api/framings", { name: "Edge Board" });
    const body = (await res.json()) as any;
    framingId = body.id;

    // Place two thoughts
    await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtA,
      x: 0,
      y: 0,
    });
    await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtB,
      x: 100,
      y: 100,
    });
  });

  test("create edge with label", async () => {
    const res = await json(`/api/framings/${framingId}/edges`, {
      source_thought_id: thoughtA,
      target_thought_id: thoughtB,
      label: "relates to",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.source_thought_id).toBe(thoughtA);
    expect(body.target_thought_id).toBe(thoughtB);
    expect(body.label).toBe("relates to");
  });

  test("missing fields returns 400", async () => {
    const res = await json(`/api/framings/${framingId}/edges`, {
      source_thought_id: thoughtA,
    });
    expect(res.status).toBe(400);
  });

  test("update edge label", async () => {
    // Create an edge
    const create = await json(`/api/framings/${framingId}/edges`, {
      source_thought_id: thoughtB,
      target_thought_id: thoughtA,
    });
    const edge = (await create.json()) as any;

    const patch = await req(
      `/api/framings/${framingId}/edges/${edge.id}`,
      {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ label: "updated label" }),
      }
    );
    expect(patch.status).toBe(200);
    const body = (await patch.json()) as any;
    expect(body.label).toBe("updated label");
  });

  test("delete edge", async () => {
    const create = await json(`/api/framings/${framingId}/edges`, {
      source_thought_id: thoughtA,
      target_thought_id: thoughtB,
      label: "to delete",
    });
    const edge = (await create.json()) as any;

    const del = await req(
      `/api/framings/${framingId}/edges/${edge.id}`,
      { method: "DELETE", headers: AUTH }
    );
    expect(del.status).toBe(204);
  });

  test("delete missing edge returns 404", async () => {
    const del = await req(
      `/api/framings/${framingId}/edges/99999`,
      { method: "DELETE", headers: AUTH }
    );
    expect(del.status).toBe(404);
  });

  test("patch missing edge returns 404", async () => {
    const res = await req(
      `/api/framings/${framingId}/edges/99999`,
      {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ label: "nope" }),
      }
    );
    expect(res.status).toBe(404);
  });
});

// ---------- Cascades ----------

describe("cascades", () => {
  test("delete framing cascades thoughts + edges", async () => {
    const create = await json("/api/framings", { name: "Cascade Board" });
    const framing = (await create.json()) as any;

    await json(`/api/framings/${framing.id}/thoughts`, {
      thought_id: thoughtA,
      x: 0,
      y: 0,
    });
    await json(`/api/framings/${framing.id}/thoughts`, {
      thought_id: thoughtB,
      x: 10,
      y: 10,
    });
    await json(`/api/framings/${framing.id}/edges`, {
      source_thought_id: thoughtA,
      target_thought_id: thoughtB,
    });

    // Delete the framing
    const del = await req(`/api/framings/${framing.id}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(del.status).toBe(204);

    // Verify placements gone via direct DB query
    const placements = await env.DB.prepare(
      "SELECT * FROM framing_thought WHERE framing_id = ?"
    )
      .bind(framing.id)
      .all();
    expect(placements.results.length).toBe(0);

    // Verify edges gone
    const edges = await env.DB.prepare(
      "SELECT * FROM framing_edge WHERE framing_id = ?"
    )
      .bind(framing.id)
      .all();
    expect(edges.results.length).toBe(0);
  });

  test("remove thought cascades its edges", async () => {
    const create = await json("/api/framings", {
      name: "Thought Cascade Board",
    });
    const framing = (await create.json()) as any;

    await json(`/api/framings/${framing.id}/thoughts`, {
      thought_id: thoughtA,
      x: 0,
      y: 0,
    });
    await json(`/api/framings/${framing.id}/thoughts`, {
      thought_id: thoughtB,
      x: 10,
      y: 10,
    });
    await json(`/api/framings/${framing.id}/edges`, {
      source_thought_id: thoughtA,
      target_thought_id: thoughtB,
      label: "should cascade",
    });

    // Remove thoughtA from framing
    await req(`/api/framings/${framing.id}/thoughts/${thoughtA}`, {
      method: "DELETE",
      headers: AUTH,
    });

    // Edges referencing thoughtA should be gone
    const edges = await env.DB.prepare(
      "SELECT * FROM framing_edge WHERE framing_id = ? AND (source_thought_id = ? OR target_thought_id = ?)"
    )
      .bind(framing.id, thoughtA, thoughtA)
      .all();
    expect(edges.results.length).toBe(0);
  });
});

// ---------- Batch ----------

describe("batch", () => {
  let framingId: number;

  beforeAll(async () => {
    const res = await json("/api/framings", { name: "Batch Board" });
    const body = (await res.json()) as any;
    framingId = body.id;

    await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtA,
      x: 0,
      y: 0,
    });
    await json(`/api/framings/${framingId}/thoughts`, {
      thought_id: thoughtB,
      x: 0,
      y: 0,
    });
  });

  test("batch update positions + verify via GET", async () => {
    const res = await req(`/api/framings/${framingId}/batch`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        thoughts: [
          { thought_id: thoughtA, x: 50, y: 60 },
          { thought_id: thoughtB, x: 70, y: 80 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.updated).toBe(2);

    // Verify via GET
    const get = await req(`/api/framings/${framingId}`);
    const graph = (await get.json()) as any;
    const a = graph.thoughts.find((t: any) => t.thought_id === thoughtA);
    const b = graph.thoughts.find((t: any) => t.thought_id === thoughtB);
    expect(a.x).toBe(50);
    expect(a.y).toBe(60);
    expect(b.x).toBe(70);
    expect(b.y).toBe(80);
  });

  test("empty array returns 400", async () => {
    const res = await req(`/api/framings/${framingId}/batch`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ thoughts: [] }),
    });
    expect(res.status).toBe(400);
  });

  test("missing auth returns 401", async () => {
    const res = await req(`/api/framings/${framingId}/batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        thoughts: [{ thought_id: thoughtA, x: 0, y: 0 }],
      }),
    });
    expect(res.status).toBe(401);
  });
});
