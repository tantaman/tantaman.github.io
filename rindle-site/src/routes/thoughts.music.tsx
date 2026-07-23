import { createFileRoute } from "@tanstack/react-router";

import { AlbumsEnrichmentView } from "../components/ThoughtEnrichmentViews.tsx";
import {
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminAlbumsQuery,
  thoughtAlbumsQuery,
} from "../components/ThoughtEnrichment.queries.ts";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/music")({
  loader: roleAwareRindleLoader({
    public: () => thoughtAlbumsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
    admin: () => thoughtAdminAlbumsQuery({ limit: ENRICHMENT_PAGE_SIZE }),
  }),
  component: AlbumsEnrichmentView,
});
