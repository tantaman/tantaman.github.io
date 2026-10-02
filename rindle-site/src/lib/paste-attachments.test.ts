import assert from "node:assert/strict";
import test from "node:test";
import { appendPasteAttachments } from "./paste-attachments.ts";
import { renderMarkdown } from "./markdown.ts";
import type { ThoughtAttachmentInput } from "./attachments.ts";

const file: ThoughtAttachmentInput = {
  id: "01K00000000000000000000000",
  storageKey: "authored/thoughts/01K00000000000000000000000",
  mediaType: "image/png",
  fileName: 'photo"><script>alert(1)</script>.png',
  createdAt: 1,
  position: 0,
};

test("image-only pastes render and filenames cannot introduce HTML", () => {
  const body = appendPasteAttachments("", "markdown", [file]);
  const html = renderMarkdown(body);
  assert.match(html, /<img src="\/api\/attachments\/authored\/thoughts\/.*\?preview=1"/);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
});

test("videos embed with controls, while other files get download links", () => {
  const body = appendPasteAttachments("# Media", "markdown", [
    { ...file, mediaType: "video/mp4", fileName: "clip.mp4" },
    { ...file, mediaType: "application/pdf", fileName: "notes.pdf" },
  ]);
  const html = renderMarkdown(body);
  assert.match(html, /<video controls preload="metadata"/);
  assert.match(html, /<a href=".*" download>notes.pdf<\/a>/);
  assert.ok(body.startsWith("# Media\n\n"));
});

test("HTML attachments land inside a complete document's body", () => {
  const body = appendPasteAttachments("<html><body>Hello</body></html>", "html", [file]);
  assert.match(body, /Hello<img .*\n<\/body><\/html>$/);
  assert.equal(appendPasteAttachments("untouched\n", "markdown", []), "untouched\n");
});
