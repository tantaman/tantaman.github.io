import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste/$id/file/$name")({
  server: { handlers: {
    GET: async ({ request, params }) => (await import("../../server/paste-file-http.ts")).handlePasteFile(request, params.id, params.name),
    HEAD: async ({ request, params }) => (await import("../../server/paste-file-http.ts")).handlePasteFile(request, params.id, params.name),
    DELETE: async ({ request, params }) => (await import("../../server/paste-file-http.ts")).handlePasteFileDelete(request, params.id, params.name),
  } },
});
