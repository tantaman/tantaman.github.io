// The app authority, runtime-AGNOSTIC. It resolves NAMED queries to ASTs (the daemon mints opaque
// leases) and talks to the daemon over the private bearer-auth'd control plane. The blog is READ-ONLY
// for now, so there are no mutators and reads are public; authoring will add a mutator registry + an
// `authorizeMutation` policy here.
//
// It is deliberately free of any host: server/rindle-http.ts adapts it to a Web Request for the Start
// API routes (src/routes/api.rindle.*.tsx) the browser calls, and the SSR loader (src/ssr.ts) calls the
// SAME factory in-process. The only per-host input is the unified Rindle connection.

import { createRindleApiServer, registerQueries } from "@rindle/api-server";
import type { RindleApiServer } from "@rindle/api-server";

import { schema } from "../shared/app-def.ts";
import type { Identity } from "../shared/auth.ts";
import { postsQuery } from "../src/components/PostCard.queries.ts";
import { postQuery } from "../src/components/PostView.queries.ts";

/** The authority's principal is the verified identity (or undefined when anonymous). Reads are public,
 *  so this is `undefined` today; it stays typed for when authoring adds authenticated writes. */
export type User = Identity | undefined;

// The authority's query surface is just the list of co-located client queries. Each `defineQuery`
// re-runs its validator on the UNTRUSTED wire args before building the AST, so a malformed client
// can't smuggle a garbage arg in.
const apiQueries = registerQueries<User>([postsQuery, postQuery]);

/** The one application-facing Rindle connection. */
export interface AppApiOptions {
  /** The unified fleet ingress for reads, SQL writes, migrations, and subscriptions. */
  url: string;
  /** The server-only public SQL bearer. Never returned to the browser. */
  token: string;
  /** Optional distinct public WebSocket ingress; normally derived from {@link url}. */
  wsUrl?: string;
}

/** Build the configured API server. Stateless: safe to construct per-request or once per process.
 *  Reads are PUBLIC; there are no writes yet. */
export function createAppApi(opts: AppApiOptions): RindleApiServer<User> {
  return createRindleApiServer<User>({
    rindle: { url: opts.url, token: opts.token, wsUrl: opts.wsUrl },
    schema,
    queries: apiQueries,
    authorizeQuery: () => true, // public reads
  });
}

/** Resolve the one connection injected by `rindle dev` (or the production host). */
export function resolveRindle(env: Record<string, string | undefined>): AppApiOptions {
  const url = env.RINDLE_URL;
  const token = env.RINDLE_DATABASE_TOKEN;
  if (!url || !token) {
    throw new Error(
      "RINDLE_URL + RINDLE_DATABASE_TOKEN are required — start the app with `rindle dev -- …`",
    );
  }
  const wsUrl = env.RINDLE_WS_URL;
  return { url, token, ...(wsUrl ? { wsUrl } : {}) };
}

/** Map an error thrown out of the API server (or body parsing) to an HTTP status + message. */
export function httpErrorOf(err: unknown): { status: number; message: string } {
  const status = typeof err === "object" && err !== null ? (err as { status?: unknown }).status : undefined;
  return {
    status: typeof status === "number" ? status : 500,
    message: String(err instanceof Error ? err.message : err),
  };
}
