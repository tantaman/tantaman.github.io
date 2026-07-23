import { createFileRoute } from "@tanstack/react-router";

import { EventsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminEventsQuery,
  thoughtEventsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/events")({
  loader: roleAwareRindleLoader({
    public: () => thoughtEventsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminEventsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: EventsEnrichmentView,
});
