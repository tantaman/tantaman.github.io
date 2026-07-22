import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { EventsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtEventsQuery } from "../components/ThoughtEnrichment.queries.ts";

export const Route = createFileRoute("/thoughts/events")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtEventsQuery({ limit: ENRICHMENT_PAGE_SIZE })]) };
  },
  component: EventsEnrichmentView,
});
