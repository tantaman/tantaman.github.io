import { createFileRoute } from "@tanstack/react-router";

import { QuestionsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminQuestionsQuery,
  thoughtQuestionsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/questions")({
  loader: roleAwareRindleLoader({
    public: () => thoughtQuestionsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminQuestionsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: QuestionsEnrichmentView,
});
