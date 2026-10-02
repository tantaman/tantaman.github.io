// Authorized access to thought and paste attachments. Authored file bytes land in R2 before their metadata
// enters the shared create/edit mutation; reads still require a visible Rindle metadata row. Keys
// that exist in the bucket but are not referenced by a visible thought or paste remain inaccessible.
//
// Any file type is accepted. Only verified images and videos are served inline (`?preview=1`);
// everything else goes out as a download with `nosniff`, so a stored type can never turn an
// attachment into a page on this origin.

import { createSqlClient } from "@rindle/sql-client";
import { MAX_ATTACHMENT_BYTES } from "../shared/attachment-limits.ts";

import { resolveRindle } from "./app-api.ts";
import { resolveSessionIdentity } from "./session.ts";
import { attachmentRange } from "./attachment-range.ts";
import {
  AttachmentUploadError,
  attachmentUploadLength,
  putR2Attachment,
  validatedAttachmentStream,
} from "./attachment-upload.ts";

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
  "video/mp4",
  "video/webm",
  "video/ogg",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
// Types a browser would run or render as a document if they were ever served inline. They are
// stored as opaque bytes so a later change to the inline rules cannot make them executable.
const ACTIVE_MEDIA_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-javascript",
  "application/xhtml+xml",
  "application/xml",
  "image/svg+xml",
  "text/html",
  "text/javascript",
  "text/xml",
]);
const GENERIC_MEDIA_TYPE = "application/octet-stream";
const MEDIA_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
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
              UNION ALL
              SELECT attachment."mediaType", attachment."fileName", 0
              FROM "pasteAttachment" AS attachment
              JOIN "paste" AS paste ON paste."id" = attachment."pasteId"
              WHERE attachment."storageKey" = ?
              LIMIT 1`,
        args: [storageKey, storageKey],
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
  body: ReadableStream<Uint8Array>,
  length: number,
  mediaType: string,
): Promise<boolean> {
  if (bucket) {
    await putR2Attachment(bucket, storageKey, body, length, mediaType);
    return true;
  }
  const file = await localAttachmentPath(storageKey);
  if (!file) {
    await body.cancel();
    return false;
  }
  const { putLocalAttachment } = await import("./local-attachment-upload.ts");
  await putLocalAttachment(file, body);
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

/** The media type an upload is stored under: the claimed one when it is well formed and inert. */
function uploadMediaType(request: Request): string {
  const claimed = (request.headers.get("Content-Type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!MEDIA_TYPE.test(claimed) || ACTIVE_MEDIA_TYPES.has(claimed)) return GENERIC_MEDIA_TYPE;
  return claimed;
}

export async function handleAttachmentUpload(request: Request): Promise<Response> {
  try {
    const origin = request.headers.get("Origin");
    if (!origin || origin !== new URL(request.url).origin) return textResponse("Forbidden", 403);
    const identity = await resolveSessionIdentity(request);
    if (identity?.role !== "admin") return textResponse("Forbidden", 403);

    const id = request.headers.get("X-Attachment-Id") ?? "";
    const fileName = uploadFileName(request);
    const mediaType = uploadMediaType(request);
    if (!ATTACHMENT_ID.test(id) || !fileName) return textResponse("Invalid attachment upload", 400);
    const length = attachmentUploadLength(request.headers, MAX_ATTACHMENT_BYTES);
    if (!request.body) return textResponse("Upload body is required", 400);
    const body = validatedAttachmentStream(
      request.body,
      mediaType,
      length,
      MAX_ATTACHMENT_BYTES,
      SAFE_INLINE_MEDIA_TYPES.has(mediaType),
    );
    const storageKey = `authored/thoughts/${id}`;
    const stored = await putAttachment(await loadBucket(), storageKey, body, length, mediaType);
    if (!stored) return textResponse("Attachment storage unavailable", 503);
    return Response.json(
      { storageKey, mediaType, fileName },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AttachmentUploadError) return textResponse(error.message, error.status);
    console.error(
      JSON.stringify({
        message: "attachment upload failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return textResponse("Could not upload attachment", 500);
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
    const storedObject = bucket ? await bucket.head(key) : null;
    const localObject = storedObject ? null : await loadLocalAttachment(key);
    if (!storedObject && !localObject) {
      const storageAvailable = Boolean(bucket) || localStorageEnabled();
      return textResponse(
        storageAvailable ? "Not found" : "Attachment storage unavailable",
        storageAvailable ? 404 : 503,
      );
    }

    const size = storedObject?.size ?? localObject?.size ?? 0;
    const etag = storedObject?.httpEtag ?? localObject?.etag ?? "";
    const ifRange = request.headers.get("If-Range");
    const range = attachmentRange(
      request.method === "GET" && (!ifRange || ifRange === etag) ? request.headers.get("Range") : null,
      size,
    );
    if (range === "unsatisfiable") {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const object = storedObject && bucket && request.method !== "HEAD"
      ? await bucket.get(key, range ? { range } : undefined)
      : null;
    if (storedObject && request.method !== "HEAD" && !object) return textResponse("Not found", 404);

    const preview = new URL(request.url).searchParams.get("preview") === "1"
      && SAFE_INLINE_MEDIA_TYPES.has(metadata.mediaType.toLowerCase());

    const headers = new Headers();
    storedObject?.writeHttpMetadata(headers);
    headers.set(
      "Cache-Control",
      metadata.private ? "private, no-store" : "public, max-age=31536000, immutable",
    );
    headers.set(
      "Content-Disposition",
      `${preview ? "inline" : "attachment"}; filename*=UTF-8''${dispositionFileName(metadata.fileName)}`,
    );
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(range?.length ?? size));
    if (range) headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`);
    headers.set("Content-Type", metadata.mediaType || GENERIC_MEDIA_TYPE);
    headers.set("ETag", etag);
    headers.set("X-Content-Type-Options", "nosniff");

    const localBody = localObject && range
      ? localObject.body.slice(range.offset, range.offset + range.length)
      : localObject?.body;
    const body = request.method === "HEAD" ? null : (object?.body ?? localBody ?? null);
    return new Response(body, { status: range ? 206 : 200, headers });
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
