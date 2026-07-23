import { createFileRoute } from "@tanstack/react-router";

import { BooksEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtBooksQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/books")({
  loader: rindle.loader({
    query: () => thoughtBooksQuery({ limit: ENRICHMENT_PAGE_SIZE }, currentQueryContext()),
  }),
  component: BooksEnrichmentView,
});
