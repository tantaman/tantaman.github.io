import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { FRAMINGS_LIMIT, framingsQuery } from "../components/Framing.queries.ts";
import { FramingsListView } from "../components/FramingsListView.tsx";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";

export const Route = createFileRoute("/thoughts/framings/")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([framingsQuery({ limit: FRAMINGS_LIMIT })]) };
  },
  component: FramingsRoute,
});

function FramingsRoute() {
  const { isAdmin } = useThoughtsFeed();
  return <FramingsListView isAdmin={isAdmin} />;
}
