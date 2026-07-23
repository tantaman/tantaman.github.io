// The whole client wire-up is ONE call — but DEFERRED to the browser. The optimistic engine is wasm
// (an in-process IVM engine), so it must never be constructed during the SSR/prerender shell pass.
// `bootClient()` lazily imports the engine + optimistic glue the first time it runs on the client and
// memoizes the promise; `app` is a live binding assigned once boot resolves, so the components that
// fire mutations (`app.mutate.*`) read the ready client at call time.
//
// Queries materialize through the API server (subscribed on the daemon's public ws); mutations flush
// through the client-side queue as confirmed in-order batches; rejections surface via onRejected.

import type { MutationEnvelope } from "@rindle/client";

import wasmUrl from "rindle-wasm-bin?url";

import { mutators, schema } from "../shared/app-def.ts";
import { ensureDevelopmentSession } from "./auth-client.ts";

// The precise client type — including the typed `mutate.*` surface — is INFERRED from the concrete
// `createRindleClient({ schema, mutators, … })` call in `bootClientInner`.
type RindleApp = Awaited<ReturnType<typeof bootClientInner>>;
type RejectionHandler = (envelope: MutationEnvelope, reason: string) => void;

let rejectionHandler: RejectionHandler = () => {};
export function onRejection(handler: RejectionHandler): () => void {
  rejectionHandler = handler;
  return () => {
    if (rejectionHandler === handler) rejectionHandler = () => {};
  };
}

/** The live optimistic client — assigned once {@link bootClient} resolves. Components import this and
 *  call `app.mutate.*` inside event handlers, by which point the root `rindle.Provider` has completed
 *  the lazy client boot. */
export let app: RindleApp;

/** Dynamically imports the wasm engine + optimistic glue (so the SSR/prerender shell never evaluates
 *  them) and constructs the optimistic client. */
async function bootClientInner() {
  const [{ createRindleClient }, { initWasm }, sessionResult] = await Promise.all([
    import("@rindle/optimistic"),
    import("@rindle/wasm"),
    ensureDevelopmentSession(),
  ]);
  await initWasm(wasmUrl);
  // No anonymous identity is minted. A sessionless reader uses the empty prediction principal; the
  // authority independently verifies the cookie and rejects any authenticated mutation that needs it.
  const sessionUserId = sessionResult.data?.user.id ?? "";
  return createRindleClient({
    schema,
    mutators,
    // The acting principal a mutator sees as ctx.user — the prediction's author. The server injects
    // its OWN verified identity for the authoritative run (server/app-api.ts sharedCtx).
    user: () => sessionUserId,
    api: {
      url: "", // same-origin: /api/rindle/* is a Start server route on this same server
      // Browser fetch sends the same-origin Better Auth cookie. No client identity header exists.
    },
    // No browser topology config: the first query lease returns the public WebSocket endpoint plus
    // a fresh placement ticket, and the optimistic client opens the correctly pinned socket lazily.
    dev: { resetOnMutationGap: import.meta.env.DEV },
    onRejected: (envelope, reason) => rejectionHandler(envelope, reason),
  });
}

let bootPromise: Promise<RindleApp> | undefined;

/** Construct the optimistic client in the browser (idempotent / memoized). */
export function bootClient(): Promise<RindleApp> {
  if (!bootPromise) {
    bootPromise = bootClientInner().then((ready) => {
      app = ready;
      // Dev-only: register this client with the in-browser devtools pane (mutation timeline, queries
      // inspector, delta stream). `import.meta.env.DEV` is a static `false` in a production build, so
      // this dynamic import of @rindle/devtools is tree-shaken out — devtools never ship to users.
      if (import.meta.env.DEV) {
        void import("@rindle/devtools").then(({ attachDevtools }) => attachDevtools(ready));
      }
      return ready;
    });
  }
  return bootPromise;
}
