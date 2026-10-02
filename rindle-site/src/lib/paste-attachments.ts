/** Name-addressed URLs survive replacement and remain compatible with legacy paste links. */
export function pasteFileUrl(pasteId: string, fileName: string, download = false): string {
  return `/paste/${encodeURIComponent(pasteId)}/file/${encodeURIComponent(fileName)}${download ? "?download" : ""}`;
}

export function formatFileSize(size: number): string {
  if (size === 0) return "size unknown";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${index > 0 && value < 10 ? value.toFixed(1) : Math.round(value)} ${units[index]}`;
}

export function pasteFileEmbed(pasteId: string, fileName: string, mediaType: string): string {
  const label = fileName.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!).replace(/[\\`*_\[\]]/g, "\\$&");
  return `${mediaType.startsWith("image/") || mediaType.startsWith("video/") ? "!" : ""}[${label}](${pasteFileUrl(pasteId, fileName)})`;
}

export function pasteLocalEmbed(fileName: string, mediaType: string): string {
  return pasteFileEmbed("local", fileName, mediaType).replace(pasteFileUrl("local", fileName), encodeURIComponent(fileName).replace(/[()]/g, (value) => value === "(" ? "%28" : "%29"));
}
