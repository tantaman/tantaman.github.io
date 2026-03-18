import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import type { Plugin } from "vite";

// Stub .wasm imports that can't be resolved in the vitest/workerd environment.
// ig-card.ts imports satori/yoga.wasm and @resvg/resvg-wasm/index_bg.wasm which
// are handled by wrangler's bundler at deploy time but not by Vite's resolver.
const WASM_STUBS = ["satori/yoga.wasm", "@resvg/resvg-wasm/index_bg.wasm"];
function stubWasmImports(): Plugin {
  return {
    name: "stub-wasm-imports",
    enforce: "pre",
    resolveId(source) {
      if (WASM_STUBS.includes(source)) return "\0" + source;
    },
    load(id) {
      if (id.startsWith("\0") && WASM_STUBS.includes(id.slice(1))) {
        return "export default new ArrayBuffer(0);";
      }
    },
  };
}

const migrations = await readD1Migrations(
  path.resolve(import.meta.dirname, "./migrations")
);

export default defineWorkersConfig({
  plugins: [stubWasmImports()],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,
        wrangler: { configPath: "./wrangler.test.toml" },
        miniflare: {
          bindings: {
            THOUGHT_SECRET: "test-secret",
            TEST_MIGRATIONS: migrations,
          },
        },
      },
    },
  },
});
