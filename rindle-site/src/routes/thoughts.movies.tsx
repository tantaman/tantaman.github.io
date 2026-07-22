import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { MoviesEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtMoviesQuery } from "../components/ThoughtEnrichment.queries.ts";

export const Route = createFileRoute("/thoughts/movies")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtMoviesQuery({ limit: ENRICHMENT_PAGE_SIZE })]) };
  },
  component: MoviesEnrichmentView,
});
