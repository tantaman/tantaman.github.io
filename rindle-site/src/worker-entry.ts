// The Worker entry (wrangler.jsonc `main`, used by the Cloudflare build only). Collaborative
// editing's WebSockets go to their document's Durable Object; everything else is TanStack Start.

import defaultEntry from "@tanstack/react-start/server-entry";

import { handleCollab } from "../server/collab-http.ts";

export { EditorDoc } from "../server/collab-doc.ts";

type Fetch = (request: Request, ...rest: unknown[]) => Promise<Response> | Response;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (new URL(request.url).pathname.startsWith("/api/collab/")) return handleCollab(request, env);
    return (defaultEntry.fetch as Fetch)(request, env, ctx);
  },
};
