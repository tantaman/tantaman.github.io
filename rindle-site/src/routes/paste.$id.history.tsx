import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { authClient } from "../auth-client.ts";
import { pasteQuery, pasteHistoryQuery, pasteRevisionQuery, type PasteDetailRow } from "../components/Paste.queries.ts";
import { PasteBody } from "../components/PasteBody.tsx";
import { pasteDate } from "../lib/paste.ts";
import { useHydrated } from "../lib/hydration.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/paste/$id/history")({
  loader: rindle.loader({ query: ({ params }) => pasteQuery(params.id) }),
  component: HistoryGate,
});
function HistoryGate() {
  const { id } = Route.useParams();
  const { data: session, isPending } = authClient.useSession();
  const hydrated = useHydrated();
  if (!hydrated || isPending) return <p className="paste-empty">Opening history…</p>;
  if (session?.user.role !== "admin") return <p>Only the admin can view edit history. <Link to="/paste/$id" params={{ id }}>Back to paste</Link></p>;
  return <History key={id} pasteId={id} />;
}
function History({ pasteId }: { pasteId: string }) {
  const [limit, setLimit] = useState(40);
  const [selected, setSelected] = useState<string | null>(null);
  const [paste] = useRoot(pasteQuery, pasteId);
  const [rows, { status }] = useRoot(pasteHistoryQuery, { pasteId, limit }, currentQueryContext());
  return <section className="paste-history">
    <p><Link to="/paste/$id" params={{ id: pasteId }}>← Back to paste</Link></p>
    <h1>Edit history{paste?.title ? `: ${paste.title}` : ""}</h1>
    <p>Each entry contains the text before that edit. Attachment links use the paste’s current files.</p>
    {!rows.length ? <p>{status === "complete" ? "No edits yet." : "Loading history…"}</p> : null}
    <ul>{rows.slice(0, limit).map((row) => <li key={row.id}><button type="button" onClick={() => setSelected(row.id)} aria-pressed={selected === row.id}>Before {pasteDate(row.savedAt)} · {row.language} · {row.title || "Untitled"}</button></li>)}</ul>
    {rows.length > limit && limit < 1_000 ? <button type="button" onClick={() => setLimit(Math.min(1_000, limit + 40))}>Load more</button> : null}
    {selected && paste ? <Revision pasteId={pasteId} revisionId={selected} paste={paste} /> : null}
  </section>;
}
function Revision({ pasteId, revisionId, paste }: { pasteId: string; revisionId: string; paste: PasteDetailRow }) {
  const [revision] = useRoot(pasteRevisionQuery, { pasteId, id: revisionId }, currentQueryContext());
  if (!revision) return <p>Loading revision…</p>;
  const sourceOnly = revision.language === "jsx" || revision.language === "tsx";
  return <article className="paste-document"><h2>{revision.title || "Untitled"}</h2>
    <details open={sourceOnly}><summary>Original source</summary><pre className="paste-code"><code>{revision.body}</code></pre></details>
    {!sourceOnly ? <PasteBody paste={{ ...revision, id: pasteId, attachments: paste.attachments }} /> : null}
  </article>;
}
