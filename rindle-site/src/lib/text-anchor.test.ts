import assert from "node:assert/strict";
import test from "node:test";

import { locateAnchor, makeAnchor } from "./text-anchor.ts";

const TEXT = "the cat sat. the cat ran. the dog sat.";

test("makeAnchor captures the quote with bounded context", () => {
  const start = TEXT.indexOf("cat ran");
  const anchor = makeAnchor(TEXT, start, start + "cat ran".length);
  assert.equal(anchor.quote, "cat ran");
  assert.equal(anchor.prefix, "the cat sat. the ");
  assert.equal(anchor.suffix, ". the dog sat.");
  assert.equal(anchor.start, start);
});

test("locateAnchor disambiguates repeats by context, not just the offset hint", () => {
  const second = TEXT.indexOf("the cat", 1);
  const anchor = { ...makeAnchor(TEXT, second, second + 7), start: 0 };
  assert.deepEqual(locateAnchor(TEXT, anchor), { start: second, end: second + 7 });
});

test("locateAnchor falls back to the nearest occurrence when context is gone", () => {
  const text = "x the cat y the cat z";
  const found = locateAnchor(text, { quote: "the cat", prefix: "zzz", suffix: "qqq", start: 13 });
  assert.deepEqual(found, { start: 12, end: 19 });
});

test("locateAnchor survives shifted text and reports a missing quote", () => {
  const start = TEXT.indexOf("dog");
  const anchor = makeAnchor(TEXT, start, start + 3);
  assert.deepEqual(locateAnchor("PREAMBLE " + TEXT, anchor), { start: start + 9, end: start + 12 });
  assert.equal(locateAnchor("no animals here", anchor), null);
});
