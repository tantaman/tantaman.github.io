import { useEffect } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";

import { ThoughtsFeedProvider } from "../components/ThoughtsFeed.tsx";
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
  const navigate = useNavigate();

  useEffect(() => {
    const match = /^#thought-(.+)$/.exec(window.location.hash);
    if (!match) return;
    void navigate({
      to: "/thoughts/$id",
      params: { id: decodeURIComponent(match[1]) },
      replace: true,
    });
  }, [navigate]);

  return (
    <div className="thoughts-shell">
      <ThoughtsNav />
      <div className="thoughts-shell-main">
        <ThoughtsFeedProvider isAdmin={isAdmin}><Outlet /></ThoughtsFeedProvider>
      </div>
    </div>
  );
}
