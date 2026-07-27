import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/dha/reports/$date")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getDhaReport } = await import("../../server/dha-http.ts");
        return getDhaReport(request, params.date);
      },
      DELETE: async ({ request, params }) => {
        const { deleteDhaReport } = await import("../../server/dha-http.ts");
        return deleteDhaReport(request, params.date);
      },
    },
  },
});
