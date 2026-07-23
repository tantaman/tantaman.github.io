import { createFileRoute } from "@tanstack/react-router";

import { MoviesEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtMoviesQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/movies")({
  loader: rindle.loader({
    query: () => thoughtMoviesQuery({ limit: ENRICHMENT_PAGE_SIZE }, currentQueryContext()),
  }),
  component: MoviesEnrichmentView,
});
