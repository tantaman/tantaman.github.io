import { createFileRoute } from "@tanstack/react-router";

// Better Auth's same-origin catch-all: OAuth initiation/callback, session lookup, and sign-out. The
// dynamic import keeps D1, better-sqlite3, and all server-only configuration out of the client bundle.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getAuth } = await import("../../server/auth.ts");
        return (await getAuth(request)).handler(request);
      },
      POST: async ({ request }) => {
        const { getAuth } = await import("../../server/auth.ts");
        return (await getAuth(request)).handler(request);
      },
    },
  },
});
