import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { framingQuery } from "../components/Framing.queries.ts";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { FramingBoardView } from "../components/framing/FramingBoardView.tsx";
import { FramingCanvasView } from "../components/framing/FramingCanvasView.tsx";
import type { FramingViewName } from "../components/framing/FramingLeftPanel.tsx";
import { app, currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/thoughts/framings/$id")({
  loader: rindle.loader({
    query: ({ params }) => framingQuery(params.id, currentQueryContext()),
  }),
  component: FramingRoute,
});

/** The arrangement is chosen here rather than inside either view, so the two stay peers: the board
 *  and the canvas render the same framing and neither has to know the other exists. */
function FramingRoute() {
  const { id } = Route.useParams();
  const { isAdmin } = useThoughtsFeed();
  const [detail, { status }] = useRoot(framingQuery, id, currentQueryContext());
  const [override, setOverride] = useState<FramingViewName | null>(null);

  const changeView = useCallback((next: FramingViewName) => {
    // A reader may still read a drawn canvas as a board — useful on a phone, where the canvas is
    // close to unusable. Only the author's choice is persisted.
    setOverride(next);
    if (isAdmin) app.mutate.updateFraming({ id, defaultView: next, updatedAt: Date.now() });
  }, [id, isAdmin]);

  // Resolve the stored arrangement before rendering either view, so a board never flashes a canvas
  // on its way in.
  if (!detail && status !== "complete") return <div className="framing-route-status">Loading framing…</div>;

  const stored = (detail as { defaultView?: string } | null)?.defaultView;
  const view: FramingViewName = override ?? (stored === "board" ? "board" : "canvas");
  const props = { id, isAdmin, view, onViewChange: changeView };
  return view === "board" ? <FramingBoardView {...props} /> : <FramingCanvasView {...props} />;
}
