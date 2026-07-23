import { createFileRoute } from "@tanstack/react-router";

import { TasksEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtTasksQuery } from "../components/ThoughtEnrichment.queries.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/tasks")({
  loader: rindle.loader({ ssr: () => thoughtTasksQuery({ limit: ENRICHMENT_PAGE_SIZE }) }),
  component: TasksEnrichmentView,
});
