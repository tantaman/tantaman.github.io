// The one TanStack↔Rindle binding for the app. Routes declare their data intent through
// `rindle.loader`; the adapter owns server/client branching and the root provider owns the
// dehydrated-seed → live-wasm handoff.

import { createRindleTanStack } from "@rindle/tanstack";

import { schema } from "../shared/app-def.ts";
import { bootClient } from "./rindle-client.ts";

export const rindle = createRindleTanStack({
  schema,
  boot: bootClient,
  preload: async (queries) => {
    // Keep the authority/daemon client out of the browser graph. This callback only runs from a
    // server route loader; the adapter's client path calls `bootClient().ensure(...)` instead.
    const { preloadRindle } = await import("./ssr.ts");
    return preloadRindle([...queries]);
  },
});
