import assert from "node:assert/strict";
import test from "node:test";
import { attachmentRange } from "./attachment-range.ts";

test("video byte ranges handle Safari probes, seeking, open ends and suffixes", () => {
  assert.deepEqual(attachmentRange("bytes=0-1", 100), { offset: 0, length: 2 });
  assert.deepEqual(attachmentRange("bytes=20-", 100), { offset: 20, length: 80 });
  assert.deepEqual(attachmentRange("bytes=20-150", 100), { offset: 20, length: 80 });
  assert.deepEqual(attachmentRange("bytes=-10", 100), { offset: 90, length: 10 });
  assert.deepEqual(attachmentRange("bytes=-150", 100), { offset: 0, length: 100 });
});

test("invalid ranges fall back to full responses and unsatisfiable ranges return 416", () => {
  assert.equal(attachmentRange(null, 100), null);
  assert.equal(attachmentRange("bytes=0-1,10-20", 100), null);
  assert.equal(attachmentRange("bytes=-", 100), null);
  assert.equal(attachmentRange("bytes=100-", 100), "unsatisfiable");
  assert.equal(attachmentRange("bytes=20-10", 100), "unsatisfiable");
  assert.equal(attachmentRange("bytes=-0", 100), "unsatisfiable");
});
