import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
await env.DB.exec("PRAGMA foreign_keys = ON");

// Stub the AI binding to avoid remote calls (usage charges, latency, flakes).
// Returns a 768-dimensional zero vector matching bge-base-en-v1.5 output shape.
(env as any).AI = {
  run: async () => ({ data: [new Array(768).fill(0)] }),
};
