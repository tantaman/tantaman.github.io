// Run against pnpm dev: ATTACHMENT_TEST_ORIGIN=http://localhost:3000 node --test server/attachment-routes.integration.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { ulid } from "ulid";

test("upload index wins over the download splat and streams files through real routes", {
  skip: !process.env.ATTACHMENT_TEST_ORIGIN,
}, async () => {
  const origin = process.env.ATTACHMENT_TEST_ORIGIN!;
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local development only");
  const anonymous = await fetch(`${origin}/api/attachments`, { method: "POST", headers: { Origin: origin } });
  assert.equal(anonymous.status, 403);
  assert.equal(await anonymous.text(), "Forbidden");
  const login = await fetch(`${origin}/api/auth/dev-login`, { method: "POST", headers: { Origin: origin } });
  assert.equal(login.status, 200);
  const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  assert.ok(cookie);
  const headers = { Cookie: cookie, Origin: origin };
  const id = ulid();
  const clientID = `attachment-http-test:${ulid()}`;
  let mid = 0;
  async function mutate(name: string, args: unknown) {
    const response = await fetch(`${origin}/api/rindle/mutate`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ clientID, mid: ++mid, name, args }),
    });
    assert.equal(response.status, 200);
    const result = await response.json() as { accepted: boolean };
    assert.equal(result.accepted, true, JSON.stringify(result));
  }
  async function upload(path: string, fileId = ulid()) {
    const response = await fetch(`${origin}${path}`, {
      method: "POST", headers: { ...headers, "Content-Type": "text/plain", "X-File-Name": "route-test.txt", "X-File-Size": "5", "X-Attachment-Id": fileId },
      body: "hello",
    });
    assert.equal(response.status, 201, await response.clone().text());
    assert.match(response.headers.get("Content-Type")!, /application\/json/);
    return { fileId, payload: await response.json() as { storageKey: string; mediaType: string; fileName: string } };
  }
  let created = false;
  try {
    const { fileId, payload } = await upload("/api/attachments");
    await mutate("createPaste", { paste: { id, body: "", excerpt: "", language: "json", title: null, parentId: null, createdAt: Date.now() }, attachments: [{ ...payload, id: fileId, size: 5, createdAt: Date.now(), position: 0 }] });
    created = true;
    const fileUrl = `${origin}/paste/${id}/file/route-test.txt`;
    const file = await fetch(fileUrl);
    assert.equal(file.status, 200);
    assert.equal(await file.text(), "hello");
    const object = await fetch(`${origin}/api/attachments/${payload.storageKey}`);
    assert.equal(object.status, 200);
    assert.equal(await object.text(), "hello");
    const head = await fetch(fileUrl, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("Content-Length"), "5");
    const range = await fetch(fileUrl, { headers: { Range: "bytes=1-3" } });
    assert.equal(range.status, 206);
    assert.equal(await range.text(), "ell");
    const page = await fetch(`${origin}/paste/${id}`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /route-test\.txt/);
    const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPo0AAAAASUVORK5CYII=", "base64");
    const image = await fetch(`${origin}/paste/${id}/files`, { method: "POST", headers: { ...headers, "Content-Type": "image/png", "X-File-Name": "diagram.png", "X-File-Size": String(imageBytes.length) }, body: imageBytes });
    assert.equal(image.status, 201);
    const revisionId = ulid();
    const body = "# Explainer\n\nBefore the image.\n\n![A diagram](diagram.png)\n\nAfter the image.";
    await mutate("editPaste", { id, revisionId, expectedRevision: "", updatedAt: Date.now(), body, excerpt: "Explainer", title: "Explainer", language: "markdown", attachments: [] });
    const read = await fetch(`${origin}/api/rindle/read`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ name: "paste", args: id }) });
    const saved = await read.json() as { rows: { cols: { contentRevision: string } }[] };
    assert.equal(saved.rows[0].cols.contentRevision, revisionId);
    const rendered = await (await fetch(`${origin}/paste/${id}`)).text();
    assert.match(rendered, /<img src="\/paste\/[^/]+\/file\/diagram.png" alt="A diagram"/);
    assert.equal((rendered.match(/<img src="\/paste\/[^/]+\/file\/diagram.png"/g) ?? []).length, 1, "Inline media is not duplicated in the gallery");
    const raw = await fetch(`${origin}/paste/${id}/raw`);
    assert.match(raw.headers.get("Cache-Control")!, /must-revalidate/);
    assert.equal(await raw.text(), body);
    assert.equal((await fetch(`${origin}/paste/${id}/edit`)).status, 200);
    assert.equal((await fetch(`${origin}/paste/${id}/history`)).status, 200);
    await upload(`/paste/${id}/files`);
    const remove = await fetch(`${fileUrl}/delete`, { method: "POST", headers });
    assert.equal(remove.status, 200);
    assert.deepEqual(await remove.json(), { ok: true });
    assert.equal((await fetch(fileUrl)).status, 404);
    await upload(`/paste/${id}/files`);
    const removeAgain = await fetch(fileUrl, { method: "DELETE", headers });
    assert.equal(removeAgain.status, 200);
    assert.deepEqual(await removeAgain.json(), { ok: true });
  } finally {
    if (created) await mutate("deletePaste", { id });
  }
});
