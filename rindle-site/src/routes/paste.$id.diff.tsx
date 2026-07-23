import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { pasteDiffQuery, type PasteDiffRow } from "../components/Paste.queries.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/paste/$id/diff")({
  loader: rindle.loader({
    query: ({ params }) => pasteDiffQuery(params.id),
    // `present` only promises a top-level row; a diff needs both complete bodies atomically.
    until: "complete",
  }),
  component: PasteDiff,
});

function PasteDiff() {
  const { id } = Route.useParams();
  const [paste, { status }] = useRoot(pasteDiffQuery, id);
  if (!paste) return <p className="paste-empty">{status === "complete" ? "Paste not found." : "Loading diff…"}</p>;
  if (!paste.parentId) {
    return (
      <section className="paste-missing">
        <h1>No parent</h1>
        <p>This paste has no parent to compare.</p>
        <Link to="/paste/$id" params={{ id }}>← Back</Link>
      </section>
    );
  }
  const parent = paste.parent[0] ?? null;
  if (!parent) return <p className="paste-empty">Parent paste not found.</p>;
  return <PasteDiffBodies paste={paste} parent={parent} />;
}

function PasteDiffBodies({
  paste,
  parent,
}: {
  paste: PasteDiffRow;
  parent: PasteDiffRow["parent"][number];
}) {

  return (
    <section className="paste-diff-page">
      <header className="paste-page-heading">
        <p>
          <Link to="/paste/$id" params={{ id: parent.id }}>{parent.title || "Untitled"}</Link>
          {" → "}
          <Link to="/paste/$id" params={{ id: paste.id }}>{paste.title || "Untitled"}</Link>
        </p>
        <h1>Diff</h1>
      </header>
      <div className="paste-diff-grid">
        <section>
          <h2>Parent</h2>
          <pre>{parent.body}</pre>
        </section>
        <section>
          <h2>Current</h2>
          <pre>{paste.body}</pre>
        </section>
      </div>
    </section>
  );
}
