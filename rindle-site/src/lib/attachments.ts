export function attachmentUrl(storageKey: string): string {
  const encoded = storageKey.split("/").map(encodeURIComponent).join("/");
  return `/api/attachments/${encoded}`;
}

export function attachmentPreviewUrl(storageKey: string): string {
  return `${attachmentUrl(storageKey)}?preview=1`;
}

export function isPreviewableImage(mediaType: string): boolean {
  return ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(
    mediaType.toLowerCase(),
  );
}
