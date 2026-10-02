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
