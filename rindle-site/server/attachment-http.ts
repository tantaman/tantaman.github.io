// Authorized access to thought attachments. Authored image bytes land in R2 before their metadata
// enters the shared create/edit mutation; reads still require a visible Rindle metadata row. Keys
// that exist in the bucket but are not referenced by a visible thought remain inaccessible.

import { createSqlClient } from "@rindle/sql-client";

import { resolveRindle } from "./app-api.ts";
import { resolveSessionIdentity } from "./session.ts";

interface AttachmentMetadata {
  mediaType: string;
  fileName: string;
  private: boolean;
}

interface LocalAttachment {
  body: ArrayBuffer;
  size: number;
  etag: string;
}

const SAFE_INLINE_MEDIA_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ATTACHMENT_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const AUTHORED_STORAGE_KEY = /^authored\/thoughts\/[0-9A-HJKMNP-TV-Z]{26}$/;

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function attachmentKey(request: Request): string | null {
  const pathname = new URL(request.url).pathname;
  const prefix = "/api/attachments/";
  if (!pathname.startsWith(prefix)) return null;
  try {
    const key = decodeURIComponent(pathname.slice(prefix.length));
    return key.length > 0 && key.length <= 1_024 ? key : null;
  } catch {
    return null;
  }
}

function dispositionFileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function loadMetadata(storageKey: string): Promise<AttachmentMetadata | null> {
  const rindle = resolveRindle(process.env);
  const sql = createSqlClient({ url: rindle.url, authToken: rindle.token });
  const { results } = await sql.batch(
    [
      {
        sql: `SELECT attachment."mediaType", attachment."fileName", thought."private"
              FROM "thoughtAttachment" AS attachment
              JOIN "thought" AS thought ON thought."id" = attachment."thoughtId"
              WHERE attachment."storageKey" = ?
              LIMIT 1`,
        args: [storageKey],
        wantRows: true,
      },
    ],
    { consistency: "strong" },
  );
  const row = results[0]?.rows[0];
  if (!row) return null;
  return {
    mediaType: String(row[0]),
    fileName: String(row[1]),
    private: Number(row[2]) === 1,
  };
}

async function loadBucket(): Promise<R2Bucket | null> {
  try {
    const specifier = "cloudflare:workers";
    const workers: typeof import("cloudflare:workers") = await import(
      /* @vite-ignore */ specifier
    );
    return workers.env.ATTACHMENTS_BUCKET;
  } catch {
    // Ordinary Node development has no Cloudflare binding. Production fails closed below if the
    // generated config and deployed binding ever drift.
    return null;
  }
}

function localStorageEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

async function localAttachmentPath(storageKey: string): Promise<string | null> {
  if (!localStorageEnabled() || !AUTHORED_STORAGE_KEY.test(storageKey)) return null;
  const pathSpecifier = "node:path";
  const path = (await import(/* @vite-ignore */ pathSpecifier)) as typeof import("node:path");
  return path.join(process.cwd(), ".rindle", "attachments", ...storageKey.split("/"));
}

async function putAttachment(
  bucket: R2Bucket | null,
  storageKey: string,
  bytes: ArrayBuffer,
  mediaType: string,
): Promise<boolean> {
  if (bucket) {
    await bucket.put(storageKey, bytes, {
      onlyIf: new Headers({ "If-None-Match": "*" }),
      httpMetadata: { contentType: mediaType },
    });
    return true;
  }
  const file = await localAttachmentPath(storageKey);
  if (!file) return false;
  const fsSpecifier = "node:fs/promises";
  const pathSpecifier = "node:path";
  const fs = (await import(/* @vite-ignore */ fsSpecifier)) as typeof import("node:fs/promises");
  const path = (await import(/* @vite-ignore */ pathSpecifier)) as typeof import("node:path");
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    await fs.writeFile(file, new Uint8Array(bytes), { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return true;
}

async function loadLocalAttachment(storageKey: string): Promise<LocalAttachment | null> {
  const file = await localAttachmentPath(storageKey);
  if (!file) return null;
  try {
    const fsSpecifier = "node:fs/promises";
    const fs = (await import(/* @vite-ignore */ fsSpecifier)) as typeof import("node:fs/promises");
    const [bytes, stat] = await Promise.all([fs.readFile(file), fs.stat(file)]);
    return {
      body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      size: bytes.byteLength,
      etag: `"local-${bytes.byteLength}-${Math.trunc(stat.mtimeMs)}"`,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function imageSignatureMatches(mediaType: string, buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (mediaType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mediaType === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (mediaType === "image/gif") return ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a";
  if (mediaType === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (mediaType === "image/avif") {
    if (ascii(4, 4) !== "ftyp") return false;
    const brands = ascii(8, Math.min(32, Math.max(0, bytes.length - 8)));
    return brands.includes("avif") || brands.includes("avis");
  }
  return false;
}

function uploadFileName(request: Request): string | null {
  const encoded = request.headers.get("X-File-Name");
  if (!encoded) return null;
  try {
    const fileName = decodeURIComponent(encoded);
    if (!fileName || fileName.length > 1_000 || /[\u0000-\u001f\u007f]/.test(fileName)) return null;
    return fileName;
  } catch {
    return null;
  }
}

export async function handleAttachmentUpload(request: Request): Promise<Response> {
  try {
    const origin = request.headers.get("Origin");
    if (!origin || origin !== new URL(request.url).origin) return textResponse("Forbidden", 403);
    const identity = await resolveSessionIdentity(request);
    if (identity?.role !== "admin") return textResponse("Forbidden", 403);

    const id = request.headers.get("X-Attachment-Id") ?? "";
    const fileName = uploadFileName(request);
    const mediaType = (request.headers.get("Content-Type") ?? "").split(";", 1)[0].toLowerCase();
    if (!ATTACHMENT_ID.test(id) || !fileName || !SAFE_INLINE_MEDIA_TYPES.has(mediaType)) {
      return textResponse("Invalid image upload", 400);
    }
    const claimedLength = Number(request.headers.get("Content-Length"));
    if (Number.isFinite(claimedLength) && claimedLength > MAX_IMAGE_BYTES) {
      return textResponse("Images must be 15 MB or smaller", 413);
    }
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
      return textResponse("Images must be between 1 byte and 15 MB", 413);
    }
    if (!imageSignatureMatches(mediaType, bytes)) {
      return textResponse("The file contents do not match its image type", 415);
    }

    const storageKey = `authored/thoughts/${id}`;
    const stored = await putAttachment(await loadBucket(), storageKey, bytes, mediaType);
    if (!stored) return textResponse("Attachment storage unavailable", 503);
    return Response.json(
      { storageKey, mediaType, fileName },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "attachment upload failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return textResponse("Could not upload image", 500);
  }
}

export async function handleAttachment(request: Request): Promise<Response> {
  const key = attachmentKey(request);
  if (!key) return textResponse("Not found", 404);

  try {
    const metadata = await loadMetadata(key);
    if (!metadata) return textResponse("Not found", 404);

    if (metadata.private) {
      const identity = await resolveSessionIdentity(request);
      if (identity?.role !== "admin") return textResponse("Not found", 404);
    }

    const bucket = await loadBucket();
    const object = bucket ? await bucket.get(key) : null;
    const localObject = object ? null : await loadLocalAttachment(key);
    if (!object && !localObject) {
      const storageAvailable = Boolean(bucket) || localStorageEnabled();
      return textResponse(
        storageAvailable ? "Not found" : "Attachment storage unavailable",
        storageAvailable ? 404 : 503,
      );
    }

    const preview = new URL(request.url).searchParams.get("preview") === "1"
      && SAFE_INLINE_MEDIA_TYPES.has(metadata.mediaType.toLowerCase());

    const headers = new Headers();
    object?.writeHttpMetadata(headers);
    headers.set(
      "Cache-Control",
      metadata.private ? "private, no-store" : "public, max-age=31536000, immutable",
    );
    headers.set(
      "Content-Disposition",
      `${preview ? "inline" : "attachment"}; filename*=UTF-8''${dispositionFileName(metadata.fileName)}`,
    );
    headers.set("Content-Length", String(object?.size ?? localObject?.size ?? 0));
    headers.set("Content-Type", metadata.mediaType || "application/octet-stream");
    headers.set("ETag", object?.httpEtag ?? localObject?.etag ?? "");
    headers.set("X-Content-Type-Options", "nosniff");

    const body = request.method === "HEAD" ? null : (object?.body ?? localObject?.body ?? null);
    return new Response(body, { headers });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "attachment request failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return textResponse("Attachment unavailable", 500);
  }
}
