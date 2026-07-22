import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { LocationsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtLocationsQuery } from "../components/ThoughtEnrichment.queries.ts";

export const Route = createFileRoute("/thoughts/locations")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtLocationsQuery({ limit: ENRICHMENT_PAGE_SIZE })]) };
  },
  component: LocationsEnrichmentView,
});
