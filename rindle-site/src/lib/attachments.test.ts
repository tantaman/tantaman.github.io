import assert from "node:assert/strict";
import test from "node:test";

import {
  GENERIC_MEDIA_TYPE,
  attachmentKindLabel,
  attachmentMediaType,
  clipboardFiles,
  pasteTextIsFileNames,
  pastedFileName,
} from "./attachments.ts";

const AT = new Date(2026, 8, 21, 14, 30, 5);

test("attachmentMediaType keeps well-formed browser types and normalises the rest", () => {
  assert.equal(attachmentMediaType({ type: "image/png" }), "image/png");
  assert.equal(attachmentMediaType({ type: "Application/PDF" }), "application/pdf");
  assert.equal(attachmentMediaType({ type: "text/plain; charset=utf-8" }), "text/plain");
  assert.equal(attachmentMediaType({ type: "" }), GENERIC_MEDIA_TYPE);
  assert.equal(attachmentMediaType({ type: "not a type" }), GENERIC_MEDIA_TYPE);
  assert.equal(attachmentMediaType({ type: "image/" }), GENERIC_MEDIA_TYPE);
});

test("attachmentKindLabel prefers the extension, then the subtype", () => {
  assert.equal(attachmentKindLabel("notes.pdf", "application/pdf"), "PDF");
  assert.equal(attachmentKindLabel("schema.gen.ts", GENERIC_MEDIA_TYPE), "TS");
  assert.equal(attachmentKindLabel("README", "text/markdown"), "MARKDOWN");
  assert.equal(attachmentKindLabel("archive", "application/x-tar"), "TAR");
  assert.equal(attachmentKindLabel("blob", GENERIC_MEDIA_TYPE), "FILE");
  assert.equal(attachmentKindLabel(".bashrc", GENERIC_MEDIA_TYPE), "FILE");
});

test("pastedFileName replaces the names browsers make up for clipboard images", () => {
  assert.equal(pastedFileName({ name: "image.png", type: "image/png" }, AT), "pasted-image-2026-09-21-143005.png");
  assert.equal(pastedFileName({ name: "image.png", type: "image/png" }, AT, 1), "pasted-image-2026-09-21-143005-2.png");
  assert.equal(pastedFileName({ name: "", type: "image/jpeg" }, AT), "pasted-image-2026-09-21-143005.jpg");
  assert.equal(pastedFileName({ name: "blob", type: "image/webp" }, AT), "pasted-image-2026-09-21-143005.webp");
  assert.equal(pastedFileName({ name: "", type: "" }, AT), "pasted-file-2026-09-21-143005.bin");
  assert.equal(pastedFileName({ name: "untitled.txt", type: "text/plain" }, AT), "pasted-file-2026-09-21-143005.txt");
});

test("pastedFileName keeps real file names", () => {
  assert.equal(pastedFileName({ name: "quarterly-report.pdf", type: "application/pdf" }, AT), "quarterly-report.pdf");
  assert.equal(pastedFileName({ name: "IMG_4021.jpeg", type: "image/jpeg" }, AT), "IMG_4021.jpeg");
  assert.equal(pastedFileName({ name: "imagery.png", type: "image/png" }, AT), "imagery.png");
});

function fakeTransfer(items: { kind: string; file: File | null }[], files: File[] = []): DataTransfer {
  return {
    items: items.map((item) => ({ kind: item.kind, type: item.file?.type ?? "text/plain", getAsFile: () => item.file })),
    files,
  } as unknown as DataTransfer;
}

test("clipboardFiles reads file items first and falls back to the file list", () => {
  const png = new File([new Uint8Array([1, 2, 3])], "image.png", { type: "image/png" });
  const pdf = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" });
  assert.deepEqual(clipboardFiles(null), []);
  assert.deepEqual(clipboardFiles(fakeTransfer([{ kind: "string", file: null }])), []);
  assert.deepEqual(clipboardFiles(fakeTransfer([{ kind: "string", file: null }, { kind: "file", file: png }])), [png]);
  assert.deepEqual(clipboardFiles(fakeTransfer([], [pdf])), [pdf]);
  assert.deepEqual(clipboardFiles(fakeTransfer([{ kind: "file", file: png }], [pdf])), [png]);
});

test("pasteTextIsFileNames tells a file manager's name-only text from real text", () => {
  const files = [{ name: "doc.pdf" }, { name: "photo.jpg" }];
  assert.equal(pasteTextIsFileNames("", files), true);
  assert.equal(pasteTextIsFileNames("  \n", files), true);
  assert.equal(pasteTextIsFileNames("doc.pdf", files), true);
  assert.equal(pasteTextIsFileNames("doc.pdf\r\nphoto.jpg\n", files), true);
  assert.equal(pasteTextIsFileNames("Q3\t42\nQ4\t51", files), false);
  assert.equal(pasteTextIsFileNames("doc.pdf and more", files), false);
});
