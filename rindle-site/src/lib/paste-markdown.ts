import { Marked } from "marked";
import type { PasteAttachment } from "../../shared/app-def.ts";
import { renderMarkdown } from "./markdown.ts";
import { pasteFileUrl } from "./paste-attachments.ts";

const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export function renderPasteMarkdown(body: string, pasteId: string, files: readonly Pick<PasteAttachment, "fileName" | "mediaType">[] = [], inlineFiles?: Set<string>): string {
  const renderer = new Marked({ renderer: {
    image(token) {
      let name = token.href;
      try { name = decodeURIComponent(name); } catch { /* Literal malformed percent filename. */ }
      const file = files.find((file) => file.fileName === name || token.href === pasteFileUrl(pasteId, file.fileName));
      if (!file) return false;
      const url = escape(pasteFileUrl(pasteId, file.fileName));
      // Token text may contain already-escaped entities; escaping again is safe for HTML attributes.
      const label = escape(token.text);
      if (["video/mp4", "video/webm", "video/ogg"].includes(file.mediaType)) {
        inlineFiles?.add(file.fileName);
        return `<video controls preload="metadata" src="${url}" aria-label="${label}"></video>`;
      }
      if (["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"].includes(file.mediaType)) {
        inlineFiles?.add(file.fileName);
        return `<img src="${url}" alt="${label}" loading="lazy"${token.title ? ` title="${escape(token.title)}"` : ""}>`;
      }
      return `<a href="${url}?download">${label || escape(file.fileName)}</a>`;
    },
    link(token) {
      let name = token.href;
      try { name = decodeURIComponent(name); } catch { /* Keep literal filename. */ }
      const file = files.find((file) => file.fileName === name);
      if (!file) return false;
      return `<a href="${escape(pasteFileUrl(pasteId, file.fileName))}">${this.parser.parseInline(token.tokens)}</a>`;
    },
  } });
  return renderMarkdown(body, renderer);
}
