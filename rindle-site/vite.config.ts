import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
// Opt-in: TanStack's devtools panel (router/store inspectors). Uncomment the plugin below to enable it
// — but KEEP `consolePiping: { enabled: false }` (see the plugins array). Needs `@tanstack/devtools-vite`.
// import { devtools } from "@tanstack/devtools-vite";

// The in-process wasm IVM engine ships prebuilt inside the @rindle/wasm package (pkg/rindle_bg.wasm).
// Alias `rindle-wasm-bin?url` to that file so the client can `import url from "rindle-wasm-bin?url"`
// without relying on a package subpath export. We resolve it off the package's main entry so it works
// wherever the package manager installed it.
const require = createRequire(import.meta.url);
const wasmBin = resolve(dirname(require.resolve("@rindle/wasm")), "..", "pkg", "rindle_bg.wasm");

// The Cloudflare runtime is opt-in so `pnpm dev` remains the one Rindle lifecycle command from
// AGENTS.md (replicator + follower + migrations + Vite under Node). The deploy/preview scripts set
// CF=1 and run the SSR environment inside workerd with native D1 bindings.
const CF = process.env.CF === "1";

const SERVER_ENV = [
  "RINDLE_URL",
  "RINDLE_DATABASE_TOKEN",
  "RINDLE_WS_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "TANTAMAN_OWNER_EMAIL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "AUTH_TRUSTED_ORIGINS",
  "AUTH_DB_PATH",
];

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_* values automatically. These are server-only, so load them into the
  // server process without ever copying them into import.meta.env or the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of SERVER_ENV) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    build: { target: "es2022" },
    resolve: {
      alias: [
        // Regex find so the `?url` suffix survives the rewrite in both dev and build.
        { find: /^rindle-wasm-bin/, replacement: wasmBin },
      ],
    },
    // Keep the @rindle/* graph bundled through the SSR/prerender pass (the wasm engine itself is a
    // client-only dynamic import in src/rindle-client.ts, so it never loads in the shell pass).
    ssr: { noExternal: [/^@rindle\//] },
    // No `server.proxy`: /api/rindle/* are Start server routes (src/routes/api.rindle.*.tsx) served by
    // this same dev server. Browser subscriptions discover the fleet edge from their query lease.
    plugins: [
      ...(CF ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
      // If you add TanStack's devtools panel, DISABLE console piping. The piping cross-forwards console
      // between the SSR server and the browser; a repeated log (a React warning, a Rindle fetch-retry)
      // echoes back and forth and snowballs into a multi-GB HMR-websocket payload that OOM-kills
      // `vite dev`. Disabling it keeps the panel + source injection, just not the console bridge.
      // devtools({ consolePiping: { enabled: false } }),
      tanstackStart(),
      react(),
    ],
  };
});
