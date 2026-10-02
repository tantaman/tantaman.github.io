import assert from "node:assert/strict";
import test from "node:test";
import { pasteFileUrl, pasteFileEmbed, formatFileSize } from "./paste-attachments.ts";
import { renderMarkdown } from "./markdown.ts";

test("name-addressed URLs encode awkward filenames exactly once", () => {
  const name = "100% of my notes (v2).txt";
  assert.equal(pasteFileUrl("id", name), `/paste/id/file/${encodeURIComponent(name)}`);
  assert.equal(pasteFileUrl("id", name, true), `/paste/id/file/${encodeURIComponent(name)}?download`);
});

test("embeds escape filenames without introducing markup", () => {
  const embed = pasteFileEmbed("id", 'photo"><script>alert(1)</script>[x].png', "image/png");
  const html = renderMarkdown(embed);
  assert.ok(html.includes("<img"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!pasteFileEmbed("id", "notes.pdf", "application/pdf").startsWith("!"));
});

test("file size formatting includes the 50 MB upload boundary", () => {
  assert.equal(formatFileSize(50 * 1024 * 1024), "50 MB");
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(0), "size unknown");
});
