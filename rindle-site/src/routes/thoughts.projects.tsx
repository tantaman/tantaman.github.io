import { createFileRoute } from "@tanstack/react-router";

import { ProjectsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import { ENRICHMENT_PAGE_SIZE, thoughtProjectsQuery } from "../components/ThoughtEnrichment.queries.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/projects")({
  loader: rindle.loader({ ssr: () => thoughtProjectsQuery({ limit: ENRICHMENT_PAGE_SIZE }) }),
  component: ProjectsEnrichmentView,
});
