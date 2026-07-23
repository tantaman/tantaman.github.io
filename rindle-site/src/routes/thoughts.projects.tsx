import { createFileRoute } from "@tanstack/react-router";

import { ProjectsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminProjectsQuery,
  thoughtProjectsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/projects")({
  loader: roleAwareRindleLoader({
    public: () => thoughtProjectsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminProjectsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: ProjectsEnrichmentView,
});
