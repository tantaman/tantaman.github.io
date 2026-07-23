import { createFileRoute } from "@tanstack/react-router";

import { TasksEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtTasksQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/tasks")({
  loader: rindle.loader({
    query: () => thoughtTasksQuery({ limit: ENRICHMENT_PAGE_SIZE }, currentQueryContext()),
  }),
  component: TasksEnrichmentView,
});
