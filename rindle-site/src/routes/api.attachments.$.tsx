import { createFileRoute } from "@tanstack/react-router";

// The catch-all preserves the legacy `/api/attachments/<R2 key>` URLs. The server module verifies
// Rindle ownership/visibility before it streams any bytes from the shared bucket.
export const Route = createFileRoute("/api/attachments/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleAttachment } = await import("../../server/attachment-http.ts");
        return handleAttachment(request);
      },
      HEAD: async ({ request }) => {
        const { handleAttachment } = await import("../../server/attachment-http.ts");
        return handleAttachment(request);
      },
    },
  },
});
