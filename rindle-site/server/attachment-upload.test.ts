import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AttachmentUploadError,
  attachmentUploadLength,
  putR2Attachment,
  validatedAttachmentStream,
} from "./attachment-upload.ts";
import { putLocalAttachment } from "./local-attachment-upload.ts";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const uploadError = (status: number) => (error: unknown) =>
  error instanceof AttachmentUploadError && error.status === status;

function chunks(values: Uint8Array[], onCancel = () => {}): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < values.length) controller.enqueue(values[index++]);
      else controller.close();
    },
    cancel: onCancel,
  }, { highWaterMark: 0 });
}

async function collect(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(body).arrayBuffer());
}

test("upload length accepts browser size or Content-Length and rejects invalid claims", () => {
  assert.equal(attachmentUploadLength(new Headers({ "X-File-Size": "8" }), 100), 8);
  assert.equal(attachmentUploadLength(new Headers({ "Content-Length": "8" }), 100), 8);
  assert.throws(() => attachmentUploadLength(new Headers(), 100), uploadError(411));
  for (const value of ["0", "-1", "NaN", "1.5", "1e2", "9007199254740992"]) {
    assert.throws(() => attachmentUploadLength(new Headers({ "X-File-Size": value }), 100), uploadError(400));
  }
  assert.throws(() => attachmentUploadLength(new Headers({ "X-File-Size": "101" }), 100), uploadError(413));
  assert.throws(() => attachmentUploadLength(new Headers({ "X-File-Size": "8", "Content-Length": "9" }), 100), uploadError(400));
});

test("signature validation preserves bytes even with a header split across network chunks", async () => {
  const image = new Uint8Array(100).fill(9);
  image.set(PNG);
  const streamed = validatedAttachmentStream(chunks([
    image.subarray(0, 3), image.subarray(3, 7), image.subarray(7, 55), image.subarray(55),
  ]), "image/png", image.length, 100, true);
  assert.deepEqual(await collect(streamed), image);
  assert.deepEqual(await collect(validatedAttachmentStream(chunks([PNG]), "image/png", 8, 100, true)), PNG);
});

test("invalid media, too few bytes, too many bytes and the size cap abort the source", async () => {
  const cases: [Uint8Array[], number, number, boolean, number][] = [
    [[new Uint8Array(8)], 8, 100, true, 415],
    [[PNG], 9, 100, true, 400],
    [[PNG, new Uint8Array(1)], 8, 100, true, 400],
    [[PNG, new Uint8Array(3)], 9, 10, true, 413],
    [[], 8, 100, true, 400],
  ];
  for (const [values, length, max, validate, status] of cases) {
    await assert.rejects(collect(validatedAttachmentStream(chunks(values), "image/png", length, max, validate)), uploadError(status));
  }
  let cancelled = false;
  await assert.rejects(collect(validatedAttachmentStream(
    chunks([new Uint8Array(40), new Uint8Array(40)], () => { cancelled = true; }),
    "image/png", 80, 100, true,
  )), uploadError(415));
  assert.ok(cancelled);
});

test("storage backpressure prevents consuming the whole upload ahead of the sink", async () => {
  let pulled = 0;
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>({
    pull(controller) { pulled++; controller.enqueue(new Uint8Array(64 * 1024)); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const reader = validatedAttachmentStream(source, "application/octet-stream", 1024 * 1024, 1024 * 1024, false).getReader();
  assert.equal(pulled, 0);
  await reader.read();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pulled, 1);
  await reader.cancel();
  assert.ok(cancelled);
});

test("the final chunk waits for EOF, preventing storage committing before an extra tail", async () => {
  const reader = validatedAttachmentStream(chunks([PNG, new Uint8Array(1)]), "image/png", 8, 100, true).getReader();
  await assert.rejects(reader.read(), uploadError(400));
});

test("R2 errors cancel the producer and retries of a completed object do not hang", { timeout: 2_000 }, async () => {
  for (const existing of [false, true]) {
    let cancelled = false;
    const body = chunks(Array.from({ length: 100 }, () => PNG), () => { cancelled = true; });
    const failure = new Error("storage failed");
    const bucket: Parameters<typeof putR2Attachment>[0] = {
      put: async () => { if (existing) return null; throw failure; },
      head: async () => ({ size: 16, httpMetadata: { contentType: "image/png" } }) as R2Object,
    };
    const saving = putR2Attachment(bucket, "key", body, 16, "image/png", () => new TransformStream());
    if (existing) await saving;
    else await assert.rejects(saving, failure);
    assert.ok(cancelled);
  }
});

test("local uploads publish complete bytes atomically, preserve retries and remove failed partials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "attachment-stream-"));
  const file = join(directory, "image");
  try {
    await putLocalAttachment(file, validatedAttachmentStream(chunks([PNG]), "image/png", 8, 100, true));
    assert.deepEqual(new Uint8Array(await readFile(file)), PNG);
    await putLocalAttachment(file, chunks([new Uint8Array([1, 2])]));
    assert.deepEqual(new Uint8Array(await readFile(file)), PNG);
    await assert.rejects(putLocalAttachment(join(directory, "invalid"), validatedAttachmentStream(
      chunks([PNG, PNG]), "image/png", 17, 100, true,
    )), uploadError(400));
    assert.deepEqual(await readdir(directory), ["image"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
