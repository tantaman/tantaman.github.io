import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { authClient } from "../auth-client.ts";
import { pasteQuery } from "../components/Paste.queries.ts";
import { PasteEditor } from "../components/PasteEditor.tsx";
import { useHydrated } from "../lib/hydration.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/paste/$id/edit")({
  loader: rindle.loader({ query: ({ params }) => pasteQuery(params.id) }),
  component: EditPaste,
});
function EditPaste() {
  const { id } = Route.useParams();
  const { data: session, isPending } = authClient.useSession();
  const hydrated = useHydrated();
  const [source, { status }] = useRoot(pasteQuery, id);
  if (!hydrated || isPending) return <p className="paste-empty">Opening editor…</p>;
  if (session?.user.role !== "admin") return <section className="paste-gate"><h1>Sign in as admin to edit this paste.</h1><Link to="/login">Open sign in →</Link></section>;
  if (!source) return <p className="paste-empty">{status === "complete" ? "Paste not found." : "Loading paste…"}</p>;
  return <PasteEditor key={id} source={source} recent={[]} editing />;
}
