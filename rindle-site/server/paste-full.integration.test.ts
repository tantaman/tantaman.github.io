// Run against pnpm dev: PASTE_TEST_ORIGIN=http://localhost:3000 node --test server/paste-full.integration.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { ulid } from "ulid";

test("full-bleed routes serve public artifacts without the app shell and reflect edits", {
  skip: !process.env.PASTE_TEST_ORIGIN,
}, async () => {
  const origin = process.env.PASTE_TEST_ORIGIN!;
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local development only");
  const login = await fetch(`${origin}/api/auth/dev-login`, { method: "POST", headers: { Origin: origin } });
  assert.equal(login.status, 200);
  const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  assert.ok(cookie);
  const clientID = `paste-full-test:${ulid()}`;
  const pastes: string[] = [];
  let mid = 0;

  async function mutate(name: string, args: unknown) {
    const response = await fetch(`${origin}/api/rindle/mutate`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ clientID, mid: ++mid, name, args }),
    });
    assert.equal(response.status, 200);
    const result = await response.json() as { accepted: boolean };
    assert.equal(result.accepted, true, JSON.stringify(result));
  }

  async function create(body: string, language: string) {
    const id = ulid();
    await mutate("createPaste", { paste: { id, body, excerpt: "Full bleed test", language, title: "Full bleed test", createdAt: Date.now(), parentId: null } });
    pastes.push(id);
    return id;
  }

  try {
    for (const body of ["<!doctype html><html><head><title>Artifact</title></head><body><main>Just the artifact</main></body></html>", "<h1>HTML fragment</h1>"]) {
      const id = await create(body, "html");
      const response = await fetch(`${origin}/paste/${id}/full`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
      assert.match(response.headers.get("Cache-Control")!, /must-revalidate/);
      assert.equal(await response.text(), body, "HTML is the actual document, with no iframe, shell, or injected styles");
      const page = await (await fetch(`${origin}/paste/${id}`)).text();
      assert.ok(page.includes(`href="/paste/${id}/full"`), "The normal paste page exposes the shareable view");
      assert.ok(page.includes("paste-document-header"));
      const edited = "<h1>Updated artifact</h1>";
      await mutate("editPaste", { id, revisionId: ulid(), expectedRevision: "", updatedAt: Date.now(), body: edited, excerpt: "Updated", title: "Updated", language: "html", attachments: [] });
      assert.equal(await (await fetch(`${origin}/paste/${id}/full`)).text(), edited);
      const raw = await fetch(`${origin}/paste/${id}/raw`);
      assert.match(raw.headers.get("Content-Type")!, /text\/plain/);
      assert.equal(await raw.text(), edited);
    }

    for (const language of ["jsx", "tsx"]) {
      const id = await create("export default function App() { return <h1>Live artifact</h1>; }", language);
      const revisionId = ulid();
      await mutate("editPaste", { id, revisionId, expectedRevision: "", updatedAt: Date.now(), body: "export default function App() { return <h1>Updated app</h1>; }", excerpt: "Updated app", title: "Updated app", language, attachments: [] });
      const response = await fetch(`${origin}/paste/${id}/full`);
      assert.equal(response.status, 200);
      const document = await response.text();
      assert.ok(document.includes(`/paste/${id}/module?v=${revisionId}`));
      assert.ok(!document.includes("<iframe") && !document.includes("paste-actions"));
      const module = await fetch(`${origin}/paste/${id}/module?v=${revisionId}`);
      assert.equal(module.status, 200);
      assert.ok((await module.text()).includes("Updated app"));
    }

    const markdown = await create("# A normal paste", "markdown");
    assert.equal((await fetch(`${origin}/paste/${markdown}/full`)).status, 404);
    assert.equal((await fetch(`${origin}/paste/${ulid()}/full`)).status, 404);
  } finally {
    for (const id of pastes) await mutate("deletePaste", { id });
  }
});
