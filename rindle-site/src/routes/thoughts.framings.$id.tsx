import { createFileRoute } from "@tanstack/react-router";

import { framingQuery } from "../components/Framing.queries.ts";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { FramingCanvasView } from "../components/framing/FramingCanvasView.tsx";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/framings/$id")({
  loader: rindle.loader({
    query: ({ params }) => framingQuery(params.id, currentQueryContext()),
  }),
  component: FramingRoute,
});

function FramingRoute() {
  const { id } = Route.useParams();
  const { isAdmin } = useThoughtsFeed();
  return <FramingCanvasView id={id} isAdmin={isAdmin} />;
}
