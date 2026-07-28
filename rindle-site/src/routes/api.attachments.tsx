import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/attachments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAttachmentUpload } = await import("../../server/attachment-http.ts");
        return handleAttachmentUpload(request);
      },
    },
  },
});
