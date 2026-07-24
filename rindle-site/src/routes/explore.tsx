import { createFileRoute } from "@tanstack/react-router";

import { ExploreCanvas } from "../components/explore/ExploreCanvas.tsx";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Tantaman" },
      { name: "description", content: "Follow links, similarity, time, and curation through the corpus." },
    ],
  }),
  component: ExploreCanvas,
});
