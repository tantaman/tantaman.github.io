import { Outlet, createFileRoute } from "@tanstack/react-router";

import {
  AdminThoughtsFeedProvider,
  PublicThoughtsFeedProvider,
} from "../components/ThoughtsFeed.tsx";
import { ThoughtsNav } from "../components/ThoughtsNav.tsx";
import { authClient } from "../auth-client.ts";
import { useHydrated } from "../lib/hydration.ts";

export const Route = createFileRoute("/thoughts")({
  head: () => ({
    meta: [
      { title: "Thoughts — Tantaman" },
      { name: "description", content: "Fragments, observations, and unfinished ideas from Tantaman." },
    ],
  }),
  component: ThoughtsLayout,
});

function ThoughtsLayout() {
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  const isAdmin = hydrated && session?.user.role === "admin";

  return (
    <div className="thoughts-shell">
      <ThoughtsNav />
      <div className="thoughts-shell-main">
        {isAdmin ? (
          <AdminThoughtsFeedProvider><Outlet /></AdminThoughtsFeedProvider>
        ) : (
          <PublicThoughtsFeedProvider><Outlet /></PublicThoughtsFeedProvider>
        )}
      </div>
    </div>
  );
}
