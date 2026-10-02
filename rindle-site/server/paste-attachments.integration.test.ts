// Run with: pnpm exec rindle exec -- node --test server/paste-attachments.integration.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
import { ulid } from "ulid";
import { createSqlClient } from "@rindle/sql-client";
import { createAppApi, resolveRindle } from "./app-api.ts";
import { localAttachmentPath } from "./attachment-storage.ts";
import { putLocalAttachment } from "./local-attachment-upload.ts";
import { handlePasteFile } from "./paste-file-http.ts";
import { normalizeAttachments, attachmentImportStatements } from "../scripts/import-pastes.mjs";
import type { ThoughtAttachmentInput } from "../src/lib/attachments.ts";

test("paste attachment parity against the live Rindle authority and named views", {
  skip: !process.env.RINDLE_URL,
}, async (t) => {
  const connection = resolveRindle(process.env);
  const api = createAppApi(connection);
  const sql = createSqlClient({ url: connection.url, authToken: connection.token });
  const user = { subject: "integration:paste-owner", username: "tantaman", displayName: "Integration", role: "admin" as const };
  const clientID = `paste-parity:${ulid()}`;
  let mid = 0;
  const pastes = new Set<string>();
  const objects: string[] = [];

  async function mutate(name: string, args: unknown, accepted = true) {
    const result = await api.pushMutation({ user, envelope: { clientID, mid: ++mid, name, args } });
    assert.equal(result.accepted, accepted, result.rejected ? result.reason : undefined);
    return result;
  }
  async function rows(query: string, args: unknown, publicRead = false) {
    const result = await api.handleReadJson({ name: query, args }, { user: publicRead ? undefined : user });
    return result.rows.map((row) => row.cols);
  }
  async function db(statement: string, args: (string | number)[] = []) {
    const { results } = await sql.batch([{ sql: statement, args, wantRows: true }], { consistency: "strong" });
    return results[0].rows;
  }
  async function file(name: string, content: string): Promise<ThoughtAttachmentInput> {
    const id = ulid();
    const storageKey = `authored/thoughts/${id}`;
    const bytes = new TextEncoder().encode(content);
    const path = await localAttachmentPath(storageKey);
    assert.ok(path);
    await putLocalAttachment(path, new Blob([bytes]).stream());
    objects.push(storageKey);
    return { id, storageKey, fileName: name, mediaType: "text/plain", size: bytes.length, createdAt: Date.now(), position: 0 };
  }
  async function create(body: string, attachments: ThoughtAttachmentInput[], parentId: string | null = null, language = "markdown") {
    const id = ulid();
    await mutate("createPaste", { paste: { id, body, excerpt: body, language, title: null, createdAt: Date.now(), parentId }, attachments });
    pastes.add(id);
    return id;
  }

  try {
    let parent = "";
    let fork = "";
    let original: ThoughtAttachmentInput;
    let replacement: ThoughtAttachmentInput;
    await t.test("empty bodies stay empty, every language accepts files, and empty/no-file writes reject", async () => {
      original = await file("100% of my notes (v2).txt", "original bytes");
      parent = await create("", [original], null, "json");
      assert.deepEqual(await db("SELECT body, title FROM paste WHERE id = ?", [parent]), [["", original.fileName]]);
      assert.equal((await rows("paste", parent)).length, 1);
      await mutate("createPaste", { paste: { id: ulid(), body: "", excerpt: "", language: "markdown", title: null, createdAt: Date.now(), parentId: null } }, false);
      const response = await handlePasteFile(new Request(`http://localhost/paste/${parent}/file/${encodeURIComponent(original.fileName)}`), parent, original.fileName);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), "original bytes");
      const download = await handlePasteFile(new Request(`http://localhost/paste/${parent}/file/x?download`), parent, original.fileName);
      assert.match(download.headers.get("Content-Disposition")!, /^attachment/);
      assert.match(download.headers.get("Cache-Control")!, /must-revalidate/);
    });
    await t.test("forks inherit references and the file browser deduplicates them", async () => {
      const before = await rows("pasteFiles", { limit: 1_000 });
      fork = await create("", [], parent);
      assert.equal((await rows("pasteFiles", { limit: 1_000 })).length, before.length);
      assert.deepEqual(await db("SELECT storageKey FROM pasteAttachment WHERE pasteId IN (?, ?) ORDER BY pasteId", [parent, fork]), [[original.storageKey], [original.storageKey]]);
    });
    await t.test("replacement keeps the parent bytes and stable filename URL intact", async () => {
      replacement = await file(original.fileName, "replacement bytes");
      await mutate("addPasteAttachments", { pasteId: fork, attachments: [replacement] });
      assert.equal((await db("SELECT id FROM pasteAttachment WHERE pasteId = ? AND fileName = ?", [fork, original.fileName])).length, 1);
      for (const [id, content] of [[parent, "original bytes"], [fork, "replacement bytes"]]) {
        const response = await handlePasteFile(new Request(`http://localhost/paste/${id}/file/x`), id, original.fileName);
        assert.equal(await response.text(), content);
      }
      assert.ok(await stat((await localAttachmentPath(original.storageKey))!));
    });
    await t.test("public file windows track sharing changes without exposing unlisted files", async () => {
      const before = await rows("pasteFiles", { limit: 1_000 }, true);
      assert.ok(!before.some((row) => row.id === replacement.storageKey));
      await mutate("setPasteShared", { id: fork, shared: 1, sharedAt: Date.now() });
      assert.ok((await rows("pasteFiles", { limit: 1_000 }, true)).some((row) => row.id === replacement.storageKey));
      await mutate("setPasteShared", { id: fork, shared: 0, sharedAt: null });
      assert.ok(!(await rows("pasteFiles", { limit: 1_000 }, true)).some((row) => row.id === replacement.storageKey));
    });
    await t.test("removing one reference preserves a fork; the last reference retires and deletes bytes", async () => {
      const inherited = await create("other fork", [], parent);
      await mutate("removePasteAttachment", { pasteId: parent, fileName: original.fileName });
      assert.ok(await stat((await localAttachmentPath(original.storageKey))!));
      await mutate("removePasteAttachment", { pasteId: inherited, fileName: original.fileName });
      await assert.rejects(readFile((await localAttachmentPath(original.storageKey))!), { code: "ENOENT" });
      assert.deepEqual(await db("SELECT state FROM pasteFile WHERE id = ?", [original.storageKey]), [["cleaned"]]);
      await mutate("addPasteAttachments", { pasteId: inherited, attachments: [original] }, false);
    });
    await t.test("deleting a paste removes its file references and bytes", async () => {
      await mutate("deletePaste", { id: fork });
      pastes.delete(fork);
      assert.equal((await db("SELECT id FROM pasteAttachment WHERE pasteId = ?", [fork])).length, 0);
      await assert.rejects(stat((await localAttachmentPath(replacement.storageKey))!), { code: "ENOENT" });
    });
    await t.test("legacy metadata imports idempotently and retains old R2 keys and file URLs", async () => {
      const legacyKey = `pastes/${parent}/123-notes.txt`;
      const legacy = normalizeAttachments([
        { id: 1, paste_id: parent, attachment_key: legacyKey, attachment_type: "text/plain", attachment_name: "old.txt", size: 4, created_at: 1 },
        { id: 2, paste_id: parent, attachment_key: legacyKey, attachment_type: "text/plain", attachment_name: "old.txt", size: 4, created_at: 2 },
      ]);
      assert.equal(legacy.length, 1);
      for (let run = 0; run < 2; run++) await sql.withTransaction((tx) => tx.batch(legacy.flatMap(attachmentImportStatements)));
      assert.deepEqual(await db("SELECT storageKey, size FROM pasteAttachment WHERE pasteId = ? AND fileName = 'old.txt'", [parent]), [[legacyKey, 4]]);
      assert.ok((await rows("pasteFiles", { limit: 1_000 })).some((row) => row.id === legacyKey));
    });
    await t.test("the authority rejects anonymous file management", async () => {
      const result = await api.pushMutation({ user: undefined, envelope: { clientID: `anonymous:${ulid()}`, mid: 1, name: "removePasteAttachment", args: { pasteId: parent, fileName: "old.txt" } } });
      assert.equal(result.accepted, false);
      assert.equal((await db("SELECT id FROM pasteAttachment WHERE pasteId = ? AND fileName = 'old.txt'", [parent])).length, 1);
    });
  } finally {
    for (const id of pastes) await mutate("deletePaste", { id });
    // Legacy object test used metadata only; leave its tombstone to model a deferred R2 cleanup.
    for (const key of objects) assert.ok((await db("SELECT state FROM pasteFile WHERE id = ?", [key]))[0]?.[0] !== "active");
    api.close();
  }
});
