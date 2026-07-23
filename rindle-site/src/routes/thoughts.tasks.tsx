import { createFileRoute } from "@tanstack/react-router";

import { TasksEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminTasksQuery,
  thoughtTasksQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/tasks")({
  loader: roleAwareRindleLoader({
    public: () => thoughtTasksQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminTasksQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: TasksEnrichmentView,
});
