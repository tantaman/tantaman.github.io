import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id/raw")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { handlePasteRaw } = await import("../../server/paste-http.ts");
        return handlePasteRaw(request, params.id);
      },
    },
  },
});
