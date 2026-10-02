import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

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
  return <div className="paste-shell">
    <nav className="paste-subnav" aria-label="Paste navigation">
      <Link to="/paste">new / recent</Link>
      <Link to="/paste/all">all pastes</Link>
      <Link to="/paste/files">files</Link>
    </nav>
    <Outlet />
  </div>;
}
