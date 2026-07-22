import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { framingQuery } from "../components/Framing.queries.ts";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { FramingCanvasView } from "../components/framing/FramingCanvasView.tsx";

export const Route = createFileRoute("/thoughts/framings/$id")({
  loader: async ({ params }): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([framingQuery(params.id)]) };
  },
  component: FramingRoute,
});

function FramingRoute() {
  const { id } = Route.useParams();
  const { isAdmin } = useThoughtsFeed();
  return <FramingCanvasView id={id} isAdmin={isAdmin} />;
}
