// The one TanStack↔Rindle binding for the app. Routes declare their data intent through
// `rindle.loader`; the adapter owns server/client branching and the root provider owns the
// dehydrated-seed → live-wasm handoff.

import {
  createRindleTanStack,
  type RindleLoaderContext,
  type RindleRouteLoader,
  type RindleRouteLoaderOptions,
} from "@rindle/tanstack";

import { schema } from "../shared/app-def.ts";
import { bootClient } from "./rindle-client.ts";

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
function loader<Context extends RindleLoaderContext = RindleLoaderContext>(
  options: RindleRouteLoaderOptions<Context>,
): RindleRouteLoader<Context> {
  const routeLoader = integration.loader<Context>({
    ...options,
    until: options.until ?? "present",
  });

  return {
    ...routeLoader,
    handler: async (context) => {
      // The route's query factory runs inside routeLoader.handler. Boot first so context-scoped
      // named queries build their local AST from the same immutable principal as the live client.
      if (typeof window !== "undefined") await bootClient();
      return routeLoader.handler(context);
    },
  };
}

export const rindle: typeof integration = { ...integration, loader };
