import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id/module")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { handlePasteModule } = await import("../../server/paste-http.ts");
        return handlePasteModule(request, params.id);
      },
    },
  },
});
