import { createFileRoute } from "@tanstack/react-router";

import { LocationsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtLocationsQuery } from "../components/ThoughtEnrichment.queries.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/locations")({
  loader: rindle.loader({ ssr: () => thoughtLocationsQuery({ limit: ENRICHMENT_PAGE_SIZE }) }),
  component: LocationsEnrichmentView,
});
