import { createFileRoute } from "@tanstack/react-router";

import { AlbumsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAlbumsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/music")({
  loader: rindle.loader({
    query: () => thoughtAlbumsQuery({ limit: ENRICHMENT_PAGE_SIZE }, currentQueryContext()),
  }),
  component: AlbumsEnrichmentView,
});
