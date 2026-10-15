import assert from "node:assert/strict";
import test from "node:test";
import { driveMutationSync, isoTx, tableSpec } from "@rindle/client";
import type { KeyedRow, MutationOp, SharedMutatorWithArgs } from "@rindle/client";

import { mutators, schema } from "./app-def.ts";
import { uploadThoughtFiles } from "../src/lib/attachments.ts";

const thought = {
  id: "thought-with-attachments",
  body: "A thought with a file",
  bodyHash: "original-hash",
  createdAt: 1,
  updatedAt: 1,
  parentId: null,
  private: 0 as const,
  contentRevision: "original-revision",
};
const user = "attachment-test-author";

function writes<Args>(mutator: SharedMutatorWithArgs<Args>, args: Args, current?: KeyedRow): MutationOp[] {
  const ops: MutationOp[] = [];
  driveMutationSync(mutator(isoTx, args, { user }), {
    apply: (op) => { ops.push(op); },
    read: (table, pk) => table === "thought" && pk.id === current?.id ? current : undefined,
    query: () => [],
  });
  return ops;
}

test("uploaded files produce the same thought attachment writes before and after authority parsing", async (t) => {
  const file = new File(["hello"], "notes.txt", { type: "text/plain" });
  t.mock.method(globalThis, "fetch", async () => Response.json({
    storageKey: "authored/thoughts/01K00000000000000000000000",
    mediaType: file.type,
    fileName: file.name,
  }, { status: 201 }));
  const attachments = await uploadThoughtFiles([
    { id: "uploaded-file", file, previewUrl: null, createdAt: 1 },
  ]);
  // The shared uploader also serves pastes, which must retain byte sizes.
  assert.equal(attachments[0].size, file.size);

  function check<Args>(mutator: SharedMutatorWithArgs<Args>, args: Args, current?: KeyedRow) {
    // The browser invokes the mutator directly; only the authority parses args.
    const predicted = writes(mutator, args, current);
    const authoritative = writes(mutator, mutator.args.parse(args), current);
    assert.deepEqual(predicted, authoritative);
    const inserts = predicted.filter((op) => op.kind === "insert" && op.table === "thoughtAttachment");
    assert.equal(inserts.length, 1);
    const insert = inserts[0];
    assert.equal(insert.kind, "insert");
    if (insert.kind !== "insert") return;
    assert.deepEqual(Object.keys(insert.row).sort(), tableSpec(schema.tables.thoughtAttachment).columns.sort());
    assert.equal(insert.row.thoughtId, thought.id);
    assert.equal(insert.row.storageKey, attachments[0].storageKey);
    assert.equal(insert.row.fileName, file.name);
    assert.equal(attachments[0].size, file.size);
  }

  await t.test("create a thought", () => {
    check(mutators.createThought, {
      thought,
      attachments,
      tags: [],
      edges: [],
      enrichments: {
        projects: [], tasks: [], taskDependencies: [], events: [], questions: [],
        locations: [], movies: [], books: [], albums: [],
      },
    });
  });

  for (const bodyChanged of [false, true]) {
    await t.test(bodyChanged ? "edit the body and attach a file" : "attach a file without changing the body", () => {
      check(mutators.editThought, {
        id: thought.id,
        expectedVersion: 1,
        historyId: "thought-history",
        body: bodyChanged ? "Revised thought" : thought.body,
        bodyHash: bodyChanged ? "revised-hash" : thought.bodyHash,
        updatedAt: 2,
        contentRevision: "revised-revision",
        tags: [],
        attachments,
      }, { ...thought, authorId: user, version: 1 });
    });
  }
});
