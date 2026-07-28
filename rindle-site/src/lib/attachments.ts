export function attachmentUrl(storageKey: string): string {
  const encoded = storageKey.split("/").map(encodeURIComponent).join("/");
  return `/api/attachments/${encoded}`;
}

export const THOUGHT_IMAGE_MEDIA_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_THOUGHT_IMAGE_BYTES = 15 * 1024 * 1024;

export interface PendingThoughtImage {
  id: string;
  file: File;
  previewUrl: string;
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

export async function uploadThoughtImages(
  images: readonly PendingThoughtImage[],
): Promise<ThoughtAttachmentInput[]> {
  const attachments = new Array<ThoughtAttachmentInput>(images.length);
  let nextIndex = 0;

  async function uploadNext(): Promise<void> {
    const position = nextIndex++;
    if (position >= images.length) return;
    const image = images[position];
    const response = await fetch("/api/attachments", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": image.file.type,
        "X-Attachment-Id": image.id,
        "X-File-Name": encodeURIComponent(image.file.name),
      },
      body: image.file,
    });
    if (!response.ok) {
      const message = (await response.text()).trim();
      throw new Error(message || `Could not upload ${image.file.name}.`);
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
      throw new Error(`The upload response for ${image.file.name} was invalid.`);
    }
    attachments[position] = {
      id: image.id,
      storageKey: payload.storageKey,
      mediaType: payload.mediaType,
      fileName: payload.fileName,
      createdAt: image.createdAt,
      position,
    };
    await uploadNext();
  }

  await Promise.all(Array.from({ length: Math.min(3, images.length) }, () => uploadNext()));
  return attachments;
}
