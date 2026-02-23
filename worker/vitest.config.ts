import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

const migrations = await readD1Migrations(
  path.resolve(import.meta.dirname, "./migrations")
);

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
    poolOptions: {
      workers: {
        isolatedStorage: false,
        singleWorker: true,
        wrangler: { configPath: "./wrangler.toml" },
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
