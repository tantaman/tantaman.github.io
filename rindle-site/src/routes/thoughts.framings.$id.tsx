import { createFileRoute } from "@tanstack/react-router";

import { framingAdminQuery, framingQuery } from "../components/Framing.queries.ts";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { FramingCanvasView } from "../components/framing/FramingCanvasView.tsx";
import { roleAwareRindleLoader } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/framings/$id")({
  loader: roleAwareRindleLoader({
    public: ({ params }) => framingQuery(params.id),
    admin: ({ params }) => framingAdminQuery(params.id),
  }),
  component: FramingRoute,
});

function FramingRoute() {
  const { id } = Route.useParams();
  const { isAdmin } = useThoughtsFeed();
  return <FramingCanvasView id={id} isAdmin={isAdmin} />;
}
