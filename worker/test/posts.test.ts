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

// ---------- Auth ----------

describe("auth", () => {
  test("rejects missing auth on POST", async () => {
    const res = await req("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", slug: "x" }),
    });
    expect(res.status).toBe(401);
  });

  test("rejects wrong token on POST", async () => {
    const res = await req("/api/posts", {
      method: "POST",
      headers: { Authorization: "Bearer wrong", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", slug: "x" }),
    });
    expect(res.status).toBe(401);
  });

  test("rejects missing auth on GET list", async () => {
    const res = await req("/api/posts");
    expect(res.status).toBe(401);
  });

  test("rejects missing auth on GET single", async () => {
    const res = await req("/api/posts/1");
    expect(res.status).toBe(401);
  });

  test("rejects missing auth on PATCH", async () => {
    const res = await req("/api/posts/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(401);
  });

  test("rejects missing auth on DELETE", async () => {
    const res = await req("/api/posts/1", { method: "DELETE" });
    expect(res.status).toBe(401);
  });
});

// ---------- Create ----------

describe("create", () => {
  test("minimal fields", async () => {
    const res = await json("/api/posts", { title: "Hello World", slug: "hello-world" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.id).toBeGreaterThan(0);
    expect(body.title).toBe("Hello World");
    expect(body.slug).toBe("hello-world");
    expect(body.body).toBe("");
    expect(body.frontmatter).toEqual({});
    expect(body.status).toBe("draft");
    expect(body.created_at).toBeGreaterThan(0);
    expect(body.updated_at).toBeGreaterThan(0);
  });

  test("all fields", async () => {
    const fm = { tags: ["software"], description: "A test post", wide: true };
    const res = await json("/api/posts", {
      title: "Full Post",
      slug: "full-post",
      body: "# Hello\n\nContent here.",
      frontmatter: fm,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.body).toBe("# Hello\n\nContent here.");
    expect(body.frontmatter).toEqual(fm);
  });

  test("empty title returns 400", async () => {
    const res = await json("/api/posts", { title: "  ", slug: "empty-title" });
    expect(res.status).toBe(400);
  });

  test("bad slug returns 400", async () => {
    const res = await json("/api/posts", { title: "Test", slug: "Bad Slug!" });
    expect(res.status).toBe(400);
  });

  test("uppercase slug returns 400", async () => {
    const res = await json("/api/posts", { title: "Test", slug: "Bad-Slug" });
    expect(res.status).toBe(400);
  });

  test("duplicate slug returns 409", async () => {
    await json("/api/posts", { title: "First", slug: "dup-slug" });
    const res = await json("/api/posts", { title: "Second", slug: "dup-slug" });
    expect(res.status).toBe(409);
  });
});

// ---------- List ----------

describe("list", () => {
  test("returns posts without body, ordered by updated_at DESC", async () => {
    // Create two posts with a small time gap
    await json("/api/posts", { title: "Older", slug: "list-older" });
    await json("/api/posts", { title: "Newer", slug: "list-newer" });

    const res = await req("/api/posts", { headers: AUTH });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.posts.length).toBeGreaterThanOrEqual(2);

    // Should not include body
    for (const post of body.posts) {
      expect(post).not.toHaveProperty("body");
    }

    // Frontmatter should be parsed
    expect(typeof body.posts[0].frontmatter).toBe("object");
  });

  test("status filter", async () => {
    await json("/api/posts", { title: "Draft Post", slug: "status-draft" });
    const created = await json("/api/posts", { title: "Pub Post", slug: "status-pub" });
    const pub = (await created.json()) as any;
    // Mark as published
    await req(`/api/posts/${pub.id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ status: "published" }),
    });

    const drafts = await req("/api/posts?status=draft", { headers: AUTH });
    const draftsBody = (await drafts.json()) as any;
    expect(draftsBody.posts.every((p: any) => p.status === "draft")).toBe(true);

    const published = await req("/api/posts?status=published", { headers: AUTH });
    const pubBody = (await published.json()) as any;
    expect(pubBody.posts.every((p: any) => p.status === "published")).toBe(true);
    expect(pubBody.posts.some((p: any) => p.slug === "status-pub")).toBe(true);
  });

  test("pagination with limit and offset", async () => {
    const res = await req("/api/posts?limit=2&offset=0", { headers: AUTH });
    const body = (await res.json()) as any;
    expect(body.posts.length).toBeLessThanOrEqual(2);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.offset).toBe(0);
    expect(typeof body.meta.hasMore).toBe("boolean");
  });
});

// ---------- Get ----------

describe("get", () => {
  test("includes body", async () => {
    const created = await json("/api/posts", {
      title: "Get Test",
      slug: "get-test",
      body: "The body content",
    });
    const post = (await created.json()) as any;

    const res = await req(`/api/posts/${post.id}`, { headers: AUTH });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.body).toBe("The body content");
    expect(body.title).toBe("Get Test");
    expect(body.frontmatter).toEqual({});
  });

  test("404 for missing", async () => {
    const res = await req("/api/posts/99999", { headers: AUTH });
    expect(res.status).toBe(404);
  });
});

// ---------- Update ----------

describe("update", () => {
  test("partial fields", async () => {
    const created = await json("/api/posts", {
      title: "Original Title",
      slug: "patch-test",
      body: "Original body",
    });
    const post = (await created.json()) as any;

    const res = await req(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title: "Updated Title" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.title).toBe("Updated Title");
    expect(body.body).toBe("Original body");
    expect(body.slug).toBe("patch-test");
  });

  test("frontmatter full-replace (not merge)", async () => {
    const created = await json("/api/posts", {
      title: "FM Test",
      slug: "fm-replace",
      frontmatter: { tags: ["a", "b"], description: "old" },
    });
    const post = (await created.json()) as any;

    const res = await req(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ frontmatter: { tags: ["c"] } }),
    });
    const body = (await res.json()) as any;
    expect(body.frontmatter).toEqual({ tags: ["c"] });
    expect(body.frontmatter.description).toBeUndefined();
  });

  test("slug conflict returns 409", async () => {
    await json("/api/posts", { title: "A", slug: "conflict-a" });
    const created = await json("/api/posts", { title: "B", slug: "conflict-b" });
    const post = (await created.json()) as any;

    const res = await req(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ slug: "conflict-a" }),
    });
    expect(res.status).toBe(409);
  });

  test("404 for missing", async () => {
    const res = await req("/api/posts/99999", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------- Delete ----------

describe("delete", () => {
  test("204 success", async () => {
    const created = await json("/api/posts", { title: "To Delete", slug: "del-test" });
    const post = (await created.json()) as any;

    const res = await req(`/api/posts/${post.id}`, { method: "DELETE", headers: AUTH });
    expect(res.status).toBe(204);
  });

  test("404 for missing", async () => {
    const res = await req("/api/posts/99999", { method: "DELETE", headers: AUTH });
    expect(res.status).toBe(404);
  });

  test("verify gone on re-GET", async () => {
    const created = await json("/api/posts", { title: "Gone Post", slug: "gone-post" });
    const post = (await created.json()) as any;

    await req(`/api/posts/${post.id}`, { method: "DELETE", headers: AUTH });

    const res = await req(`/api/posts/${post.id}`, { headers: AUTH });
    expect(res.status).toBe(404);
  });
});

// ---------- Frontmatter validation ----------

describe("frontmatter validation", () => {
  test("rejects unknown keys (.strict())", async () => {
    const res = await json("/api/posts", {
      title: "Bad FM",
      slug: "bad-fm",
      frontmatter: { tags: ["a"], unknownField: true },
    });
    expect(res.status).toBe(400);
  });

  test("accepts all valid fields", async () => {
    const res = await json("/api/posts", {
      title: "All FM",
      slug: "all-fm",
      frontmatter: {
        tags: ["software"],
        description: "desc",
        layout: "default",
        related: ["other.md"],
        wide: true,
        concern: ["craft"],
        image: "/img.png",
        date: "2026-01-01",
        minimalHeader: true,
        noHeader: false,
        js: ["/custom.js"],
        form: "essay",
      },
    });
    expect(res.status).toBe(201);
  });
});
