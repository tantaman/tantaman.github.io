// The one TanStack↔Rindle binding for the app. Routes declare their data intent through
// `rindle.loader`; the adapter owns server/client branching and the root provider owns the
// dehydrated-seed → live-wasm handoff.

import type { AnyQuery, EnsureQueryUntil } from "@rindle/client";
import {
  createRindleTanStack,
  type RindleLoaderContext,
  type RindleRouteLoader,
} from "@rindle/tanstack";

import { schema } from "../shared/app-def.ts";
import { bootClient, isAdminClient } from "./rindle-client.ts";

const integration = createRindleTanStack({
  schema,
  boot: bootClient,
  preload: async (queries) => {
    // Keep the authority/daemon client out of the browser graph. This callback only runs from a
    // server route loader; the adapter's client path calls `bootClient().ensure(...)` instead.
    const { preloadRindle } = await import("./ssr.ts");
    return preloadRindle([...queries]);
  },
});

// Route entry is local-first by default: if the exact view already has useful rows in the wasm
// store, commit the navigation immediately and let its retained server subscription revalidate in
// the background. Callers can still opt into `until: "complete"` for an authority-gated screen.
export const rindle: typeof integration = {
  ...integration,
  loader: (options) => integration.loader({ ...options, until: options.until ?? "present" }),
};

type QueryList = AnyQuery | readonly AnyQuery[];

interface RoleAwareLoaderOptions<Context extends RindleLoaderContext> {
  public: (context: Context) => QueryList;
  admin: (context: Context) => QueryList;
  /** Extra public queries for a direct server-rendered request, but not client route entry. */
  ssr?: (context: Context) => QueryList;
  until?: EnsureQueryUntil;
}

/**
 * SSR stays intentionally public, while a browser navigation waits for the exact query family its
 * authenticated screen will consume. This avoids retaining both visibility variants or teaching a
 * public loader to request an authority-gated query.
 */
export function roleAwareRindleLoader<Context extends RindleLoaderContext = RindleLoaderContext>(
  options: RoleAwareLoaderOptions<Context>,
): RindleRouteLoader<Context> {
  const until = options.until ?? "present";
  const publicLoader = integration.loader<Context>({
    query: options.public,
    ...(options.ssr ? { ssr: options.ssr } : {}),
    until,
  });

  return {
    staleReloadMode: "blocking",
    handler: async (context) => {
      if (typeof window === "undefined") return publicLoader.handler(context);

      // bootClient captures the immutable per-page principal (and establishes the development owner
      // session) before returning, so this is the same branch the destination component will mount.
      const client = await bootClient();
      const makeQueries = isAdminClient() ? options.admin : options.public;
      const value = makeQueries(context);
      const queries = Array.isArray(value) ? value : [value as AnyQuery];
      await Promise.all(
        queries.map((query) => client.ensure(query, {
          until,
          signal: context.abortController.signal,
        })),
      );
      return { rindle: {} };
    },
  };
}
