import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { AlbumsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtAlbumsQuery } from "../components/ThoughtEnrichment.queries.ts";

export const Route = createFileRoute("/thoughts/music")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtAlbumsQuery({ limit: ENRICHMENT_PAGE_SIZE })]) };
  },
  component: AlbumsEnrichmentView,
});
