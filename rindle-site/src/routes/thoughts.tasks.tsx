import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { TasksEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtTasksQuery } from "../components/ThoughtEnrichment.queries.ts";

export const Route = createFileRoute("/thoughts/tasks")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtTasksQuery({ limit: ENRICHMENT_PAGE_SIZE })]) };
  },
  component: TasksEnrichmentView,
});
