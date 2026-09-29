// /api/collab/<id>: signed-in callers (anyone, for the communal "demo") reach the document's EditorDoc Durable Object
// (collab-doc.ts, packages/wasm-editor/docs/COLLAB.md). Cloudflare build only; see src/worker-entry.ts.

import type { CollabEnv } from "./collab-doc.ts";
import { resolveSessionIdentity } from "./session.ts";

const DOC_ID = /^\/api\/collab\/([A-Za-z0-9_-]{1,64})$/;
/** The communal document /wasm-editor/canvas opens: anyone may edit it, signed in or not. */
const OPEN_DOC = "demo";

/**
 * /api/collab/<id>. A WebSocket upgrade joins the document; a plain GET says whether the caller may
 * (200) or must sign in first (401), since a browser can't read why an upgrade failed.
 */
export async function handleCollab(request: Request, env: CollabEnv): Promise<Response> {
  const url = new URL(request.url);
  const match = DOC_ID.exec(url.pathname);
  if (!match) return new Response("not found", { status: 404 });
  // The session cookie rides a WebSocket upgrade from any page, so only this origin may open one.
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return new Response("forbidden", { status: 403 });
  const who = (await resolveSessionIdentity(request)) ?? (match[1] === OPEN_DOC ? guest() : null);
  if (!who) return Response.json({ error: "sign in to edit" }, { status: 401 });
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return Response.json({ name: who.displayName });
  const headers = new Headers(request.headers);
  headers.set("x-collab-doc", match[1]);
  headers.set("x-collab-user", who.subject);
  headers.set("x-collab-name", (who.displayName || who.username || "someone").slice(0, 64));
  const stub = env.COLLAB_DOCS.get(env.COLLAB_DOCS.idFromName(match[1]));
  return stub.fetch(new Request(request, { headers }));
}

/** A visitor without a session, one per connection. */
function guest() {
  const id = crypto.randomUUID().slice(0, 8);
  return { subject: `guest:${id}`, displayName: `guest ${id.slice(0, 4)}`, username: "" };
}
