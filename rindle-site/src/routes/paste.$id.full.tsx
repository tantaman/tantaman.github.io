import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id/full")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { handlePasteFull } = await import("../../server/paste-http.ts");
        return handlePasteFull(request, params.id);
      },
    },
  },
});
