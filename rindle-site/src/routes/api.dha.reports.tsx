import { createFileRoute } from "@tanstack/react-router";

// REST compatibility for the independently built DHA report viewer at `/dha-report-app/`.
export const Route = createFileRoute("/api/dha/reports")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { listDhaReports } = await import("../../server/dha-http.ts");
        return listDhaReports(request);
      },
      POST: async ({ request }) => {
        const { createDhaReport } = await import("../../server/dha-http.ts");
        return createDhaReport(request);
      },
    },
  },
});
