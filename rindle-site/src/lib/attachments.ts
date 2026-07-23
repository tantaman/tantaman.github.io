export function attachmentUrl(storageKey: string): string {
  const encoded = storageKey.split("/").map(encodeURIComponent).join("/");
  return `/api/attachments/${encoded}`;
}
