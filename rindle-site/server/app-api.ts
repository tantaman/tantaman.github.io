// The app authority, runtime-AGNOSTIC. It resolves NAMED queries to ASTs (the daemon mints opaque
// leases) and talks to the daemon over the private bearer-auth'd control plane. Reads are public;
// authoring mutations require the server-verified Tantaman administrator.
//
// It is deliberately free of any host: server/rindle-http.ts adapts it to a Web Request for the Start
// API routes (src/routes/api.rindle.*.tsx) the browser calls, and the SSR loader (src/ssr.ts) calls the
// SAME factory in-process. The only per-host input is the unified Rindle connection.

import {
  createRindleApiServer,
  defineApiMutators,
  registerQueries,
  runSharedMutation,
  scoped,
  sharedApiMutators,
} from "@rindle/api-server";
import type { ApiMutators, MutationContext, RindleApiServer } from "@rindle/api-server";

import { mutators, schema } from "../shared/app-def.ts";
import { canPublish, commentAuthorName } from "../shared/auth.ts";
import type { Identity } from "../shared/auth.ts";
import {
  scheduleThoughtEnrichments,
  type ThoughtEnrichmentConfig,
} from "./thought-enrichment.ts";
import { featuredPostsQuery, postsQuery } from "../src/components/PostCard.queries.ts";
import {
  postEditorFacetOptionsQuery,
  postEditorMetadataOptionsQuery,
  postEditorQuery,
} from "../src/components/PostEditor.queries.ts";
import { postQuery } from "../src/components/PostView.queries.ts";
import { postCommentsQuery } from "../src/components/PostComments.queries.ts";
import {
  thoughtAdminFeedQuery,
  thoughtAdminQuery,
  thoughtAdminRepliesQuery,
  thoughtQuery,
  thoughtRepliesQuery,
  thoughtsQuery,
} from "../src/components/ThoughtCard.queries.ts";
import { thoughtEnrichmentQueries } from "../src/components/ThoughtEnrichment.queries.ts";
import {
  framingAdminQuery,
  framingAdminThoughtConnectionsQuery,
  framingAdminThoughtsQuery,
  framingPostsQuery,
  framingQuery,
  framingThoughtConnectionsQuery,
  framingThoughtsQuery,
  framingsQuery,
} from "../src/components/Framing.queries.ts";
import {
  pasteAdminFeedQuery,
  pasteDiffQuery,
  pasteQuery,
  pastesQuery,
} from "../src/components/Paste.queries.ts";
import {
  searchPastesQuery,
  searchPostsQuery,
  searchThoughtsQuery,
} from "../src/components/Search.queries.ts";

/** The authority's principal is the verified identity (or undefined when anonymous). Public post
 * reads accept either; private authoring reads and every mutation require the administrator. */
export type User = Identity | undefined;

/** Publishing is server-authority only. Authoring mutators pass this gate before yielding SQL; a
 * browser's optimistic role or claimed username is never trusted. */
export function requirePublisher(user: User): asserts user is Identity {
  if (canPublish(user)) return;
  const error = new Error("Only an administrator can manage posts.");
  Object.assign(error, { status: 403 });
  throw error;
}

/** Comments are the account-level write surface: readers and administrators may participate, while
 * every publishing/thought mutator continues through the stricter publisher gate below. */
export function requireAccount(user: User): asserts user is Identity {
  if (user) return;
  const error = new Error("Sign in to comment.");
  Object.assign(error, { status: 401 });
  throw error;
}

// The authority's query surface is just the list of co-located client queries. Each `defineQuery`
// re-runs its validator on the UNTRUSTED wire args before building the AST, so a malformed client
// can't smuggle a garbage arg in.
const apiQueries = registerQueries<User>([
  postsQuery,
  featuredPostsQuery,
  postQuery,
  postCommentsQuery,
  postEditorQuery,
  postEditorFacetOptionsQuery,
  postEditorMetadataOptionsQuery,
  thoughtsQuery,
  thoughtQuery,
  thoughtAdminFeedQuery,
  thoughtRepliesQuery,
  thoughtAdminRepliesQuery,
  thoughtAdminQuery,
  ...thoughtEnrichmentQueries,
  framingsQuery,
  framingQuery,
  framingAdminQuery,
  framingThoughtsQuery,
  framingAdminThoughtsQuery,
  framingPostsQuery,
  framingThoughtConnectionsQuery,
  framingAdminThoughtConnectionsQuery,
  pastesQuery,
  pasteAdminFeedQuery,
  pasteQuery,
  pasteDiffQuery,
  searchPostsQuery,
  searchThoughtsQuery,
  searchPastesQuery,
]);

function publisherPrincipal(ctx: MutationContext<User>) {
  requirePublisher(ctx.user);
  return { user: ctx.user.subject };
}

/** The one application-facing Rindle connection. */
export interface AppApiOptions {
  /** The unified fleet ingress for reads, SQL writes, migrations, and subscriptions. */
  url: string;
  /** The server-only public SQL bearer. Never returned to the browser. */
  token: string;
  /** Optional distinct public WebSocket ingress; normally derived from {@link url}. */
  wsUrl?: string;
  /** Optional server-only providers used by post-commit structured thought projections. */
  thoughtEnrichment?: ThoughtEnrichmentConfig;
}

/** Build the configured API server. Stateless: safe to construct per-request or once per process. */
export function createAppApi(opts: AppApiOptions): RindleApiServer<User> {
  const sharedMutators = sharedApiMutators<User>(mutators, publisherPrincipal);
  const apiMutators = defineApiMutators<User, ApiMutators<User>>({
    ...sharedMutators,
    // A comment's owner comes from ctx.user inside the shared body. The public byline is an arg so
    // the browser can predict it, but the authority accepts it only when it matches the signed
    // account session exactly.
    createPostComment: async (tx, raw, ctx) => {
      const args = mutators.createPostComment.args.parse(raw);
      requireAccount(ctx.user);
      if (args.comment.authorName !== commentAuthorName(ctx.user)) {
        const error = new Error("Comment author does not match the signed-in account.");
        Object.assign(error, { status: 403 });
        throw error;
      }
      await runSharedMutation(
        mutators.createPostComment,
        args,
        { user: ctx.user.subject },
        tx,
      );
    },
    deletePostComment: async (tx, raw, ctx) => {
      const args = mutators.deletePostComment.args.parse(raw);
      requireAccount(ctx.user);
      await runSharedMutation(
        mutators.deletePostComment,
        args,
        { user: ctx.user.subject },
        tx,
      );
    },
    // Local structured rows are written by the exact shared body the browser predicted. Network
    // metadata is authority-only work, scheduled only after that transaction commits.
    createThought: scoped<User, unknown>(async (scope, raw, ctx) => {
      const args = mutators.createThought.args.parse(raw);
      await scope.transact(mutators.createThought, args, publisherPrincipal(ctx));
      await scheduleThoughtEnrichments(scope.sql, args.enrichments, opts.thoughtEnrichment ?? {});
    }),
  });
  return createRindleApiServer<User>({
    rindle: { url: opts.url, token: opts.token, wsUrl: opts.wsUrl },
    schema,
    queries: apiQueries,
    mutators: apiMutators,
    authorizeQuery: ({ name, user }) =>
      (!name.startsWith("postEditor") &&
        !name.startsWith("thoughtAdmin") &&
        !name.startsWith("framingAdmin") &&
        !name.startsWith("pasteAdmin")) ||
      canPublish(user),
    authorizeMutation: ({ user }) => {
      requireAccount(user);
      return true;
    },
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
  const mapboxToken = env.MAPBOX_TOKEN?.trim();
  const tmdbApiKey = env.TMDB_API_KEY?.trim();
  return {
    url,
    token,
    ...(wsUrl ? { wsUrl } : {}),
    ...((mapboxToken || tmdbApiKey)
      ? { thoughtEnrichment: { ...(mapboxToken ? { mapboxToken } : {}), ...(tmdbApiKey ? { tmdbApiKey } : {}) } }
      : {}),
  };
}

/** Map an error thrown out of the API server (or body parsing) to an HTTP status + message. */
export function httpErrorOf(err: unknown): { status: number; message: string } {
  const status = typeof err === "object" && err !== null ? (err as { status?: unknown }).status : undefined;
  return {
    status: typeof status === "number" ? status : 500,
    message: String(err instanceof Error ? err.message : err),
  };
}
