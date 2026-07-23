import { createFileRoute } from "@tanstack/react-router";

import { AlbumsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtAlbumsQuery } from "../components/ThoughtEnrichment.queries.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/music")({
  loader: rindle.loader({ ssr: () => thoughtAlbumsQuery({ limit: ENRICHMENT_PAGE_SIZE }) }),
  component: AlbumsEnrichmentView,
});
