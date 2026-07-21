import { createFileRoute } from "@tanstack/react-router";

// Local-only automatic owner login. The server helper fails closed outside the Node development
// runtime; keeping this as a static route also prevents the Better Auth catch-all from handling it.
export const Route = createFileRoute("/api/auth/dev-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createLocalOwnerSession } = await import("../../server/auth.ts");
        return createLocalOwnerSession(request);
      },
    },
  },
});
