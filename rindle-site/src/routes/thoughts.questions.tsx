import { createFileRoute } from "@tanstack/react-router";

import { QuestionsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtQuestionsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/questions")({
  loader: rindle.loader({
    query: () => thoughtQuestionsQuery({ limit: ENRICHMENT_PAGE_SIZE }, currentQueryContext()),
  }),
  component: QuestionsEnrichmentView,
});
