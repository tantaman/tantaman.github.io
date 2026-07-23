import { createFileRoute } from "@tanstack/react-router";

import { BooksEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminBooksQuery,
  thoughtBooksQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/books")({
  loader: roleAwareRindleLoader({
    public: () => thoughtBooksQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminBooksQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: BooksEnrichmentView,
});
