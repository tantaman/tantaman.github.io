import { describe, test, expect } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

const COOKIE = { Cookie: "paste_auth=test-secret" };

function req(path: string, init?: RequestInit) {
  return app.request(path, init, env);
}

function fileForm(fields: Record<string, string>, files: File[]): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  for (const f of files) fd.append("file", f);
  return fd;
}

function txt(name: string, content: string, type = "text/plain"): File {
  return new File([content], name, { type });
}

// POST /paste redirects to /paste/{id}; pull the id back out.
async function createPaste(fields: Record<string, string>, files: File[]): Promise<string> {
  const res = await req("/paste", {
    method: "POST",
    headers: COOKIE,
    body: fileForm(fields, files),
  });
  expect(res.status).toBe(302);
  const location = res.headers.get("Location")!;
  expect(location).toMatch(/^\/paste\/.+/);
  return location.replace("/paste/", "");
}

describe("paste attachments", () => {
  test("a paste carries files, served by name", async () => {
    const id = await createPaste(
      { body: "# Notes\n\nsee the attached", language: "markdown" },
      [txt("notes.txt", "hello from the file")],
    );

    const view = await req(`/paste/${id}`, { headers: COOKIE });
    expect(view.status).toBe(200);
    const html = await view.text();
    expect(html).toContain("notes.txt");
    expect(html).toContain(`/paste/${id}/file/notes.txt`);

    const file = await req(`/paste/${id}/file/notes.txt`);
    expect(file.status).toBe(200);
    expect(file.headers.get("Content-Type")).toBe("text/plain");
    expect(await file.text()).toBe("hello from the file");

    // Public by URL, like the paste itself.
    const anon = await req(`/paste/${id}/file/notes.txt`);
    expect(anon.status).toBe(200);

    // ?download flips the disposition without changing the bytes.
    const dl = await req(`/paste/${id}/file/notes.txt?download`);
    expect(dl.headers.get("Content-Disposition")).toContain("attachment");
  });

  test("a file-only paste needs no body and names itself after its file", async () => {
    const id = await createPaste({ body: "", language: "markdown" }, [
      txt("budget.csv", "a,b\n1,2", "text/csv"),
    ]);

    const row = await env.DB.prepare("SELECT title, body FROM paste WHERE id = ?")
      .bind(id)
      .first<{ title: string; body: string }>();
    expect(row!.title).toBe("budget.csv");
    expect(row!.body).toBe("");

    // It shows up in the file store index.
    const files = await req("/paste/files", { headers: COOKIE });
    expect(files.status).toBe(200);
    expect(await files.text()).toContain("budget.csv");
  });

  test("an empty paste with no files is rejected", async () => {
    const res = await req("/paste", {
      method: "POST",
      headers: COOKIE,
      body: fileForm({ body: "", language: "markdown" }, []),
    });
    expect(res.status).toBe(400);
  });

  test("files can be attached to an existing paste", async () => {
    const id = await createPaste({ body: "start", language: "markdown" }, []);

    const add = await req(`/paste/${id}/files`, {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
      body: fileForm({}, [txt("later.txt", "added after the fact")]),
    });
    expect(add.status).toBe(201);
    const { attachments } = await add.json<{ attachments: { attachment_name: string }[] }>();
    expect(attachments.map((a) => a.attachment_name)).toEqual(["later.txt"]);

    expect((await req(`/paste/${id}/file/later.txt`)).status).toBe(200);
  });

  test("uploads require auth", async () => {
    const id = await createPaste({ body: "start", language: "markdown" }, []);
    const res = await req(`/paste/${id}/files`, {
      method: "POST",
      body: fileForm({}, [txt("nope.txt", "x")]),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/paste/login");
  });

  test("a fork inherits its parent's files and shares the bytes", async () => {
    const parentId = await createPaste({ body: "v1", language: "markdown" }, [
      txt("shared.txt", "one copy in R2"),
    ]);
    const forkId = await createPaste(
      { body: "v2", language: "markdown", parent_id: parentId },
      [],
    );

    expect(await (await req(`/paste/${forkId}/file/shared.txt`)).text()).toBe("one copy in R2");

    const keys = await env.DB.prepare(
      "SELECT DISTINCT attachment_key FROM paste_attachment WHERE paste_id IN (?, ?)",
    )
      .bind(parentId, forkId)
      .all<{ attachment_key: string }>();
    expect(keys.results).toHaveLength(1);

    // Detaching from the fork must not pull the bytes out from under the parent.
    const del = await req(`/paste/${forkId}/file/shared.txt`, {
      method: "DELETE",
      headers: { Authorization: "Bearer test-secret" },
    });
    expect(del.status).toBe(200);
    expect((await req(`/paste/${forkId}/file/shared.txt`)).status).toBe(404);
    expect(await (await req(`/paste/${parentId}/file/shared.txt`)).text()).toBe("one copy in R2");

    // Last reference gone — now the object goes too.
    const delParent = await req(`/paste/${parentId}/file/shared.txt`, {
      method: "DELETE",
      headers: { Authorization: "Bearer test-secret" },
    });
    expect(delParent.status).toBe(200);
    expect(await env.BUCKET.get(keys.results[0].attachment_key)).toBeNull();
  });

  test("re-uploading a name replaces it rather than shadowing it", async () => {
    const id = await createPaste({ body: "v1", language: "markdown" }, [
      txt("notes.txt", "first"),
    ]);

    const add = await req(`/paste/${id}/files`, {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
      body: fileForm({}, [txt("notes.txt", "second")]),
    });
    expect(add.status).toBe(201);

    const rows = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM paste_attachment WHERE paste_id = ? AND attachment_name = ?",
    )
      .bind(id, "notes.txt")
      .first<{ n: number }>();
    expect(rows!.n).toBe(1);
    expect(await (await req(`/paste/${id}/file/notes.txt`)).text()).toBe("second");
  });

  test("a name replaced on a fork leaves the parent's copy alone", async () => {
    const parentId = await createPaste({ body: "v1", language: "markdown" }, [
      txt("doc.txt", "parent copy"),
    ]);
    const forkId = await createPaste(
      { body: "v2", language: "markdown", parent_id: parentId },
      [txt("doc.txt", "fork copy")],
    );

    expect(await (await req(`/paste/${parentId}/file/doc.txt`)).text()).toBe("parent copy");
    expect(await (await req(`/paste/${forkId}/file/doc.txt`)).text()).toBe("fork copy");
  });

  test("awkward filenames survive the round trip", async () => {
    // A literal % in a name is the one that bites: decoding it twice throws.
    const id = await createPaste({ body: "", language: "markdown" }, [
      txt("100% of my notes (v2).txt", "still here"),
    ]);

    const res = await req(`/paste/${id}/file/${encodeURIComponent("100% of my notes (v2).txt")}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("still here");
  });

  test("the public file index shows only files on shared pastes", async () => {
    const privateId = await createPaste({ body: "private", language: "markdown" }, [
      txt("secret-plan.txt", "shh"),
    ]);
    const sharedId = await createPaste({ body: "public", language: "markdown" }, [
      txt("public-plan.txt", "hello"),
    ]);
    await req(`/paste/${sharedId}/share`, { method: "POST", headers: COOKIE });

    const anon = await (await req("/paste/files")).text();
    expect(anon).toContain("public-plan.txt");
    expect(anon).not.toContain("secret-plan.txt");

    const authed = await (await req("/paste/files", { headers: COOKIE })).text();
    expect(authed).toContain("secret-plan.txt");
    expect(privateId).toBeTruthy();
  });
});
