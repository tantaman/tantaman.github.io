import { createSqlClient } from "@rindle/sql-client";
import { ulid } from "ulid";
import { createAppApi, httpErrorOf, resolveRindle } from "./app-api.ts";
import { handleAttachment, handleAttachmentUpload } from "./attachment-http.ts";
import { resolveSessionIdentity } from "./session.ts";

/** Resolve the logical filename on every request; replacements never retain an immutable cache. */
export async function handlePasteFile(request: Request, pasteId: string, fileName: string): Promise<Response> {
  try {
    const connection = resolveRindle(process.env);
    const sql = createSqlClient({ url: connection.url, authToken: connection.token });
    const { results } = await sql.batch([{
      sql: `SELECT a.storageKey FROM pasteAttachment a JOIN paste p ON p.id = a.pasteId
            WHERE a.pasteId = ? AND a.fileName = ? ORDER BY a.createdAt DESC, a.id DESC LIMIT 1`,
      args: [pasteId, fileName], wantRows: true,
    }], { consistency: "strong" });
    const key = results[0]?.rows[0]?.[0];
    if (typeof key !== "string") return new Response("Not found", { status: 404 });
    const url = new URL(request.url);
    const download = url.searchParams.has("download");
    url.pathname = `/api/attachments/${key.split("/").map(encodeURIComponent).join("/")}`;
    url.search = download ? "" : "?preview=1";
    const response = await handleAttachment(new Request(url, { method: request.method, headers: request.headers }));
    const headers = new Headers(response.headers);
    if (response.ok && !headers.get("Cache-Control")?.includes("private")) headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    const { status, message } = httpErrorOf(error);
    return new Response(message, { status });
  }
}

async function mutateFile(request: Request, name: string, args: unknown): Promise<Response> {
  const user = await resolveSessionIdentity(request);
  if (user?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const origin = request.headers.get("Origin");
  if (origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  const api = createAppApi(resolveRindle(process.env));
  try {
    const result = await api.pushMutation({ user, request, envelope: {
      clientID: `paste-file-http:${ulid()}`, mid: 1, name, args,
    } });
    return result.rejected ? Response.json({ error: result.reason }, { status: 400 }) : Response.json({ ok: true });
  } finally { api.close(); }
}

export async function handlePasteFileDelete(request: Request, pasteId: string, fileName: string): Promise<Response> {
  try { return await mutateFile(request, "removePasteAttachment", { pasteId, fileName }); }
  catch (error) {
    const { status, message } = httpErrorOf(error);
    return new Response(message, { status });
  }
}

/** A raw file body uses the same streaming transport as /api/attachments. */
export async function handlePasteFileUpload(request: Request, pasteId: string): Promise<Response> {
  try {
    const id = ulid();
    const headers = new Headers(request.headers);
    headers.set("X-Attachment-Id", id);
    const response = await handleAttachmentUpload(new Request(request, { headers }));
    if (!response.ok) return response;
    const attachment = await response.json() as { storageKey: string; mediaType: string; fileName: string };
    return await mutateFile(request, "addPasteAttachments", { pasteId, attachments: [{
      ...attachment, id, size: Number(headers.get("X-File-Size") ?? headers.get("Content-Length")),
      createdAt: Date.now(), position: 0,
    }] });
  } catch (error) {
    const { status, message } = httpErrorOf(error);
    return new Response(message, { status });
  }
}
