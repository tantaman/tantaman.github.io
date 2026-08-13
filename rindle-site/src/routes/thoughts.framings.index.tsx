import { createFileRoute } from "@tanstack/react-router";

import { FRAMINGS_LIMIT, framingsQuery } from "../components/Framing.queries.ts";
import { FramingsListView } from "../components/FramingsListView.tsx";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/framings/")({
  loader: rindle.loader({
    query: () => framingsQuery({ limit: FRAMINGS_LIMIT }, currentQueryContext()),
  }),
  component: FramingsRoute,
});

function FramingsRoute() {
  const { isAdmin } = useThoughtsFeed();
  return <FramingsListView isAdmin={isAdmin} />;
}
