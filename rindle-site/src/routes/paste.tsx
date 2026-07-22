import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/paste")({
  head: () => ({
    meta: [
      { title: "Paste — Tantaman" },
      { name: "description", content: "Code, notes, and small experiments from Tantaman." },
    ],
  }),
  component: PasteLayout,
});

function PasteLayout() {
  return <div className="paste-shell"><Outlet /></div>;
}
