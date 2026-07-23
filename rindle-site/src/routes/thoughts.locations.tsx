import { createFileRoute } from "@tanstack/react-router";

import { LocationsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminLocationsQuery,
  thoughtLocationsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/locations")({
  loader: roleAwareRindleLoader({
    public: () => thoughtLocationsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminLocationsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: LocationsEnrichmentView,
});
