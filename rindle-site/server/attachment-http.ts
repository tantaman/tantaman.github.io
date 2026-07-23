// Authorized, streaming access to imported thought attachments. Rindle owns the metadata and
// visibility decision; R2 remains the byte store. Keys that exist in the shared legacy bucket but
// are not referenced by a visible thought (wardrobe photos, generated cards, caches) stay hidden.

import { createSqlClient } from "@rindle/sql-client";

import { resolveRindle } from "./app-api.ts";
import { resolveSessionIdentity } from "./session.ts";

interface AttachmentMetadata {
  mediaType: string;
  fileName: string;
  private: boolean;
}

const SAFE_INLINE_MEDIA_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
    if (!bucket) return textResponse("Attachment storage unavailable", 503);
    const object = await bucket.get(key);
    if (!object) return textResponse("Not found", 404);

    const preview = new URL(request.url).searchParams.get("preview") === "1"
      && SAFE_INLINE_MEDIA_TYPES.has(metadata.mediaType.toLowerCase());

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set(
      "Cache-Control",
      metadata.private ? "private, no-store" : "public, max-age=31536000, immutable",
    );
    headers.set(
      "Content-Disposition",
      `${preview ? "inline" : "attachment"}; filename*=UTF-8''${dispositionFileName(metadata.fileName)}`,
    );
    headers.set("Content-Length", String(object.size));
    headers.set("Content-Type", metadata.mediaType || "application/octet-stream");
    headers.set("ETag", object.httpEtag);
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(request.method === "HEAD" ? null : object.body, { headers });
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
