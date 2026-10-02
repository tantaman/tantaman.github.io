import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id/file/$name/delete")({
  server: { handlers: {
    POST: async ({ request, params }) => (await import("../../server/paste-file-http.ts")).handlePasteFileDelete(request, params.id, params.name),
  } },
});
