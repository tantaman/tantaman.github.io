import { createFileRoute } from "@tanstack/react-router";

import { EventsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtEventsQuery } from "../components/ThoughtEnrichment.queries.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/events")({
  loader: rindle.loader({ ssr: () => thoughtEventsQuery({ limit: ENRICHMENT_PAGE_SIZE }) }),
  component: EventsEnrichmentView,
});
