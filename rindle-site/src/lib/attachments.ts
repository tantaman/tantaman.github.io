export function attachmentUrl(storageKey: string): string {
  const encoded = storageKey.split("/").map(encodeURIComponent).join("/");
  return `/api/attachments/${encoded}`;
}

/** Image types the server is willing to serve inline (`?preview=1`); everything else downloads. */
export const THOUGHT_IMAGE_MEDIA_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_THOUGHT_FILE_BYTES = 15 * 1024 * 1024;

export const GENERIC_MEDIA_TYPE = "application/octet-stream";

/** A file staged in a composer, not yet uploaded. `previewUrl` is set for previewable images only. */
export interface PendingThoughtFile {
  id: string;
  file: File;
  previewUrl: string | null;
  createdAt: number;
}

export interface ThoughtAttachmentInput {
  id: string;
  storageKey: string;
  mediaType: string;
  fileName: string;
  createdAt: number;
  position: number;
}

export function attachmentPreviewUrl(storageKey: string): string {
  return `${attachmentUrl(storageKey)}?preview=1`;
}

export function isPreviewableImage(mediaType: string): boolean {
  return (THOUGHT_IMAGE_MEDIA_TYPES as readonly string[]).includes(mediaType.toLowerCase());
}

const MEDIA_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;

/**
 * The media type to upload a file under. Browsers leave `File.type` empty for extensions they do
 * not recognise (`.ncl`, `.sql`, …), and a few report values with parameters; both collapse to a
 * plain generic type so the server never sees an empty or malformed `Content-Type`.
 */
export function attachmentMediaType(file: Pick<File, "type">): string {
  const type = file.type.split(";", 1)[0].trim().toLowerCase();
  return MEDIA_TYPE.test(type) ? type : GENERIC_MEDIA_TYPE;
}

/** The short label shown on a staged non-image file: its extension, or the media type's subtype. */
export function attachmentKindLabel(fileName: string, mediaType: string): string {
  const dot = fileName.lastIndexOf(".");
  const extension = dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot + 1) : "";
  if (extension && extension.length <= 8) return extension.toUpperCase();
  const subtype = mediaType.split("/")[1] ?? "";
  if (subtype && subtype !== "octet-stream") return subtype.replace(/^x-/, "").slice(0, 8).toUpperCase();
  return "FILE";
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Clipboard image names browsers make up (`image.png`, `blob`, …) rather than a real file name. */
const PLACEHOLDER_NAME = /^(?:image|blob|clipboard|screenshot|pasted[-_ ]?image|untitled)?(?:\.[a-z0-9]+)?$/i;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * A name for a file that arrived from the clipboard. Screenshots and copied images have no name
 * of their own — every browser calls them `image.png` — so a timestamped one keeps attachments
 * distinguishable in the card's download list. Files copied from a file manager keep their names.
 */
export function pastedFileName(file: Pick<File, "name" | "type">, at: Date, index = 0): string {
  if (file.name && !PLACEHOLDER_NAME.test(file.name)) return file.name;
  const mediaType = attachmentMediaType(file);
  const originalExtension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1) : "";
  const extension = IMAGE_EXTENSIONS[mediaType] ?? (originalExtension || "bin");
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
    + `-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  const kind = mediaType.startsWith("image/") ? "pasted-image" : "pasted-file";
  return `${kind}-${stamp}${index > 0 ? `-${index + 1}` : ""}.${extension}`;
}

/**
 * The files carried by a paste event, if any. `items` is consulted first because some browsers
 * expose a copied bitmap only there; `files` is the fallback for the ones that fill just that.
 */
export function clipboardFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  if (files.length === 0) files.push(...Array.from(data.files ?? []));
  return files;
}

/**
 * Whether a paste that carries files should also let its text land in the textarea. A file copied
 * from Finder or Explorer comes with its own name as `text/plain`; pasting that name as body text
 * would be noise. Text that is anything else (a spreadsheet's cells beside their rendered bitmap)
 * is kept, because it is what the author most likely wanted.
 */
export function pasteTextIsFileNames(text: string, files: readonly Pick<File, "name">[]): boolean {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return true;
  const names = new Set(files.map((file) => file.name));
  return lines.every((line) => names.has(line));
}

export async function uploadThoughtFiles(
  pending: readonly PendingThoughtFile[],
): Promise<ThoughtAttachmentInput[]> {
  const attachments = new Array<ThoughtAttachmentInput>(pending.length);
  let nextIndex = 0;

  async function uploadNext(): Promise<void> {
    const position = nextIndex++;
    if (position >= pending.length) return;
    const entry = pending[position];
    const response = await fetch("/api/attachments", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": attachmentMediaType(entry.file),
        "X-Attachment-Id": entry.id,
        "X-File-Name": encodeURIComponent(entry.file.name),
      },
      body: entry.file,
    });
    if (!response.ok) {
      const message = (await response.text()).trim();
      throw new Error(message || `Could not upload ${entry.file.name}.`);
    }
    const payload = await response.json() as {
      storageKey?: unknown;
      mediaType?: unknown;
      fileName?: unknown;
    };
    if (
      typeof payload.storageKey !== "string" ||
      typeof payload.mediaType !== "string" ||
      typeof payload.fileName !== "string"
    ) {
      throw new Error(`The upload response for ${entry.file.name} was invalid.`);
    }
    attachments[position] = {
      id: entry.id,
      storageKey: payload.storageKey,
      mediaType: payload.mediaType,
      fileName: payload.fileName,
      createdAt: entry.createdAt,
      position,
    };
    await uploadNext();
  }

  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, () => uploadNext()));
  return attachments;
}
