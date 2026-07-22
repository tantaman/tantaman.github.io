import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { pasteQuery, type PasteDetailRow } from "../components/Paste.queries.ts";

export const Route = createFileRoute("/paste/$id/diff")({
  loader: async ({ params }): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([pasteQuery(params.id)]) };
  },
  component: PasteDiff,
});

function PasteDiff() {
  const { id } = Route.useParams();
  const [paste, { status }] = useRoot(pasteQuery, id);
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
  return <PasteDiffBodies paste={paste} parentId={paste.parentId} />;
}

function PasteDiffBodies({ paste, parentId }: { paste: PasteDetailRow; parentId: string }) {
  const [parent, { status }] = useRoot(pasteQuery, parentId);
  if (!parent) return <p className="paste-empty">{status === "complete" ? "Parent paste not found." : "Loading parent…"}</p>;

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
