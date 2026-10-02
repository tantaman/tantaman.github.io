import { createFileRoute } from "@tanstack/react-router";

// An index route outranks the download splat, which also matches an empty key.
export const Route = createFileRoute("/api/attachments/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAttachmentUpload } = await import("../../server/attachment-http.ts");
        return handleAttachmentUpload(request);
      },
    },
  },
});
