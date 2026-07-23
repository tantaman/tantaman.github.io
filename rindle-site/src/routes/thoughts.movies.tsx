import { createFileRoute } from "@tanstack/react-router";

import { MoviesEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminMoviesQuery,
  thoughtMoviesQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/movies")({
  loader: roleAwareRindleLoader({
    public: () => thoughtMoviesQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminMoviesQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: MoviesEnrichmentView,
});
