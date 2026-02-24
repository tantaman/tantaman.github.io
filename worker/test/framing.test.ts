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
    const create = await json("/api/framings", { name: "Graph Board" });
    const framing = (await create.json()) as any;

    // Place a thought node
    await json(`/api/framings/${framing.id}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 10,
      y: 20,
    });

    const get = await req(`/api/framings/${framing.id}`);
    const body = (await get.json()) as any;
    expect(body.framing.id).toBe(framing.id);
    expect(body.nodes.length).toBe(1);
    expect(body.nodes[0].node_type).toBe("thought");
    expect(body.nodes[0].item_id).toBe(String(thoughtA));
    expect(body.nodes[0].body).toBe("Thought A");
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

// ---------- Nodes ----------

describe("nodes", () => {
  let framingId: number;

  beforeAll(async () => {
    const res = await json("/api/framings", { name: "Node Board" });
    const body = (await res.json()) as any;
    framingId = body.id;
  });

  test("place thought node with x/y/w/h", async () => {
    const res = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 100,
      y: 200,
      w: 300,
      h: 150,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.node_type).toBe("thought");
    expect(body.item_id).toBe(String(thoughtA));
    expect(body.x).toBe(100);
    expect(body.y).toBe(200);
    expect(body.w).toBe(300);
    expect(body.h).toBe(150);
    expect(body.id).toBeGreaterThan(0);
  });

  test("place post node", async () => {
    const res = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "post",
      item_id: "2025-01-15-my-post",
      x: 400,
      y: 100,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.node_type).toBe("post");
    expect(body.item_id).toBe("2025-01-15-my-post");
  });

  test("missing required fields returns 400", async () => {
    const res = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtB),
    });
    expect(res.status).toBe(400);
  });

  test("framing 404", async () => {
    const res = await json("/api/framings/99999/nodes", {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 0,
      y: 0,
    });
    expect(res.status).toBe(404);
  });

  test("duplicate placement returns 409", async () => {
    const res = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 0,
      y: 0,
    });
    expect(res.status).toBe(409);
  });

  test("same item_id different node_type is allowed", async () => {
    // item_id "1" as post vs thought should both be allowed
    const res = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "post",
      item_id: String(thoughtA),
      x: 500,
      y: 500,
    });
    expect(res.status).toBe(201);
  });

  test("update position by nodeId", async () => {
    // Place a new node to get its id
    const create = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtB),
      x: 0,
      y: 0,
    });
    const node = (await create.json()) as any;

    const res = await req(
      `/api/framings/${framingId}/nodes/${node.id}`,
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

  test("remove node by nodeId + verify gone", async () => {
    const create = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtC),
      x: 0,
      y: 0,
    });
    const node = (await create.json()) as any;

    const del = await req(
      `/api/framings/${framingId}/nodes/${node.id}`,
      { method: "DELETE", headers: AUTH }
    );
    expect(del.status).toBe(204);

    // Verify it's gone via GET framing
    const get = await req(`/api/framings/${framingId}`);
    const body = (await get.json()) as any;
    expect(
      body.nodes.find((n: any) => n.id === node.id)
    ).toBeUndefined();
  });
});

// ---------- Edges ----------

describe("edges", () => {
  let framingId: number;
  let nodeAId: number;
  let nodeBId: number;

  beforeAll(async () => {
    const res = await json("/api/framings", { name: "Edge Board" });
    const body = (await res.json()) as any;
    framingId = body.id;

    // Place two thought nodes
    const a = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 0,
      y: 0,
    });
    nodeAId = ((await a.json()) as any).id;

    const b = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtB),
      x: 100,
      y: 100,
    });
    nodeBId = ((await b.json()) as any).id;
  });

  test("create edge with label", async () => {
    const res = await json(`/api/framings/${framingId}/edges`, {
      source_node_id: nodeAId,
      target_node_id: nodeBId,
      label: "relates to",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.source_node_id).toBe(nodeAId);
    expect(body.target_node_id).toBe(nodeBId);
    expect(body.label).toBe("relates to");
  });

  test("missing fields returns 400", async () => {
    const res = await json(`/api/framings/${framingId}/edges`, {
      source_node_id: nodeAId,
    });
    expect(res.status).toBe(400);
  });

  test("update edge label", async () => {
    const create = await json(`/api/framings/${framingId}/edges`, {
      source_node_id: nodeBId,
      target_node_id: nodeAId,
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
      source_node_id: nodeAId,
      target_node_id: nodeBId,
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

  test("edge between thought and post nodes", async () => {
    const postNode = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "post",
      item_id: "2025-01-01-test-post",
      x: 200,
      y: 200,
    });
    const postNodeId = ((await postNode.json()) as any).id;

    const res = await json(`/api/framings/${framingId}/edges`, {
      source_node_id: nodeAId,
      target_node_id: postNodeId,
      label: "references",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.source_node_id).toBe(nodeAId);
    expect(body.target_node_id).toBe(postNodeId);
  });
});

// ---------- Cascades ----------

describe("cascades", () => {
  test("delete framing cascades nodes + edges", async () => {
    const create = await json("/api/framings", { name: "Cascade Board" });
    const framing = (await create.json()) as any;

    const a = await json(`/api/framings/${framing.id}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 0,
      y: 0,
    });
    const nodeAId = ((await a.json()) as any).id;

    const b = await json(`/api/framings/${framing.id}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtB),
      x: 10,
      y: 10,
    });
    const nodeBId = ((await b.json()) as any).id;

    await json(`/api/framings/${framing.id}/edges`, {
      source_node_id: nodeAId,
      target_node_id: nodeBId,
    });

    // Delete the framing
    const del = await req(`/api/framings/${framing.id}`, {
      method: "DELETE",
      headers: AUTH,
    });
    expect(del.status).toBe(204);

    // Verify nodes gone via direct DB query
    const nodes = await env.DB.prepare(
      "SELECT * FROM framing_node WHERE framing_id = ?"
    )
      .bind(framing.id)
      .all();
    expect(nodes.results.length).toBe(0);

    // Verify edges gone
    const edges = await env.DB.prepare(
      "SELECT * FROM framing_edge WHERE framing_id = ?"
    )
      .bind(framing.id)
      .all();
    expect(edges.results.length).toBe(0);
  });

  test("remove node cascades its edges", async () => {
    const create = await json("/api/framings", {
      name: "Node Cascade Board",
    });
    const framing = (await create.json()) as any;

    const a = await json(`/api/framings/${framing.id}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 0,
      y: 0,
    });
    const nodeAId = ((await a.json()) as any).id;

    const b = await json(`/api/framings/${framing.id}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtB),
      x: 10,
      y: 10,
    });
    const nodeBId = ((await b.json()) as any).id;

    await json(`/api/framings/${framing.id}/edges`, {
      source_node_id: nodeAId,
      target_node_id: nodeBId,
      label: "should cascade",
    });

    // Remove nodeA from framing
    await req(`/api/framings/${framing.id}/nodes/${nodeAId}`, {
      method: "DELETE",
      headers: AUTH,
    });

    // Edges referencing nodeA should be gone
    const edges = await env.DB.prepare(
      "SELECT * FROM framing_edge WHERE framing_id = ? AND (source_node_id = ? OR target_node_id = ?)"
    )
      .bind(framing.id, nodeAId, nodeAId)
      .all();
    expect(edges.results.length).toBe(0);
  });
});

// ---------- Batch ----------

describe("batch", () => {
  let framingId: number;
  let nodeAId: number;
  let nodeBId: number;

  beforeAll(async () => {
    const res = await json("/api/framings", { name: "Batch Board" });
    const body = (await res.json()) as any;
    framingId = body.id;

    const a = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtA),
      x: 0,
      y: 0,
    });
    nodeAId = ((await a.json()) as any).id;

    const b = await json(`/api/framings/${framingId}/nodes`, {
      node_type: "thought",
      item_id: String(thoughtB),
      x: 0,
      y: 0,
    });
    nodeBId = ((await b.json()) as any).id;
  });

  test("batch update positions + verify via GET", async () => {
    const res = await req(`/api/framings/${framingId}/batch`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        nodes: [
          { node_id: nodeAId, x: 50, y: 60 },
          { node_id: nodeBId, x: 70, y: 80 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.updated).toBe(2);

    // Verify via GET
    const get = await req(`/api/framings/${framingId}`);
    const graph = (await get.json()) as any;
    const a = graph.nodes.find((n: any) => n.id === nodeAId);
    const b = graph.nodes.find((n: any) => n.id === nodeBId);
    expect(a.x).toBe(50);
    expect(a.y).toBe(60);
    expect(b.x).toBe(70);
    expect(b.y).toBe(80);
  });

  test("empty array returns 400", async () => {
    const res = await req(`/api/framings/${framingId}/batch`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ nodes: [] }),
    });
    expect(res.status).toBe(400);
  });

  test("missing auth returns 401", async () => {
    const res = await req(`/api/framings/${framingId}/batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes: [{ node_id: nodeAId, x: 0, y: 0 }],
      }),
    });
    expect(res.status).toBe(401);
  });
});

// ---------- GET framing returns post nodes without thought data ----------

describe("post node in GET response", () => {
  test("post nodes have null body/timestamp/color", async () => {
    const create = await json("/api/framings", { name: "Post Test Board" });
    const framing = (await create.json()) as any;

    await json(`/api/framings/${framing.id}/nodes`, {
      node_type: "post",
      item_id: "2025-06-01-my-blog-post",
      x: 50,
      y: 75,
    });

    const get = await req(`/api/framings/${framing.id}`);
    const body = (await get.json()) as any;
    expect(body.nodes.length).toBe(1);
    const node = body.nodes[0];
    expect(node.node_type).toBe("post");
    expect(node.item_id).toBe("2025-06-01-my-blog-post");
    expect(node.body).toBeNull();
    expect(node.timestamp).toBeNull();
    expect(node.color).toBeNull();
    expect(node.x).toBe(50);
    expect(node.y).toBe(75);
  });
});
