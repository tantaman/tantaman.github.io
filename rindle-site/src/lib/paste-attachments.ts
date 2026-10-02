import {
  attachmentPreviewUrl,
  attachmentUrl,
  isPreviewableImage,
  type ThoughtAttachmentInput,
} from "./attachments.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function pasteSupportsAttachments(language: string): boolean {
  return ["markdown", "html", "plaintext"].includes(language);
}

/** Embed media in rendered pastes, and retain download links for all other file types. */
export function appendPasteAttachments(
  body: string,
  language: string,
  attachments: readonly ThoughtAttachmentInput[],
): string {
  if (attachments.length === 0) return body;
  if (!pasteSupportsAttachments(language)) throw new Error("Choose Markdown, HTML or Plain text to attach files.");
  const snippets = attachments.map((attachment) => {
    const url = attachmentUrl(attachment.storageKey);
    const preview = attachmentPreviewUrl(attachment.storageKey);
    const name = escapeHtml(attachment.fileName);
    if (language === "markdown" || language === "html") {
      if (isPreviewableImage(attachment.mediaType)) {
        return `<img src="${preview}" alt="${name}" />`;
      }
      if (["video/mp4", "video/webm", "video/ogg"].includes(attachment.mediaType)) {
        return `<video controls preload="metadata" src="${preview}" aria-label="${name}"></video>`;
      }
      return `<a href="${url}" download>${name}</a>`;
    }
    return `${attachment.fileName}: ${url}`;
  }).join("\n\n");
  // A complete HTML document needs its attachments inside the body.
  if (language === "html" && /<\/body\s*>/i.test(body)) {
    return body.replace(/<\/body\s*>/i, () => `${snippets}\n</body>`);
  }
  return `${body.trimEnd()}${body.trim() ? "\n\n" : ""}${snippets}`;
}
