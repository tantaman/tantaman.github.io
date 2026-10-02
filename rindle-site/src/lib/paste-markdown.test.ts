import assert from "node:assert/strict";
import test from "node:test";
import { renderPasteMarkdown } from "./paste-markdown.ts";
import { pasteFileUrl, pasteLocalEmbed } from "./paste-attachments.ts";

const files = [{ fileName: "diagram (v2).png", mediaType: "image/png" }, { fileName: "demo.mp4", mediaType: "video/mp4" }, { fileName: "notes.pdf", mediaType: "application/pdf" }];
test("inline images and videos sit between explainer paragraphs and resolve against the current paste", () => {
  const body = `Before\n\n${pasteLocalEmbed(files[0].fileName, files[0].mediaType)}\n\nMiddle\n\n![The demo](demo.mp4)\n\nAfter`;
  const html = renderPasteMarkdown(body, "fork", files);
  assert.match(html, /<img src="\/paste\/fork\/file\/diagram%20\(v2\)\.png"/);
  assert.match(html, /<video controls preload="metadata" src="\/paste\/fork\/file\/demo.mp4" aria-label="The demo"><\/video>/);
  assert.ok(html.indexOf("Before") < html.indexOf("<img"));
  assert.ok(html.indexOf("Middle") < html.indexOf("<video"));
  assert.ok(html.indexOf("After") > html.indexOf("<video"));
});
test("stable URLs, reference-style markdown, and ordinary attachment links work", () => {
  const html = renderPasteMarkdown(`![demo](${pasteFileUrl("id", "demo.mp4")})\n\n![diagram][file]\n\n[file]: <diagram (v2).png>\n\n[Notes](notes.pdf)`, "id", files);
  assert.match(html, /<video /);
  assert.match(html, /<img /);
  assert.match(html, /href="\/paste\/id\/file\/notes.pdf">Notes/);
});
test("external images and code remain unchanged; unsupported inline media downloads", () => {
  const html = renderPasteMarkdown("![external](https://example.com/image.png)\n\n`![demo](demo.mp4)`\n\n![notes](notes.pdf)", "id", files);
  assert.match(html, /src="https:\/\/example.com\/image.png"/);
  assert.ok(!html.includes("<video"));
  assert.match(html, /<code>!\[demo\]\(demo.mp4\)<\/code>/);
  assert.match(html, /href="\/paste\/id\/file\/notes.pdf\?download"/);
});
test("attachment labels and titles cannot inject HTML attributes", () => {
  const html = renderPasteMarkdown('![x" onerror="alert(1)](demo.mp4 "title")', "id", files);
  assert.ok(!html.includes('aria-label="x" onerror='));
  assert.ok(!html.includes("<script"));
});
