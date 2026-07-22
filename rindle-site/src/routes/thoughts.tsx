import { Outlet, createFileRoute } from "@tanstack/react-router";

import {
  AdminThoughtsFeedProvider,
  PublicThoughtsFeedProvider,
} from "../components/ThoughtsFeed.tsx";
import { authClient } from "../auth-client.ts";

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
  const isAdmin = session?.user.role === "admin";

  return isAdmin ? (
    <AdminThoughtsFeedProvider><Outlet /></AdminThoughtsFeedProvider>
  ) : (
    <PublicThoughtsFeedProvider><Outlet /></PublicThoughtsFeedProvider>
  );
}
