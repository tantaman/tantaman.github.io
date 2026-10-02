import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id/files")({
  server: { handlers: {
    POST: async ({ request, params }) => (await import("../../server/paste-file-http.ts")).handlePasteFileUpload(request, params.id),
  } },
});
