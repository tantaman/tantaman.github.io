import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { authClient } from "../auth-client.ts";
import {
  PASTES_RECENT_LIMIT,
  pasteQuery,
  pastesQuery,
} from "../components/Paste.queries.ts";
import { PasteEditor } from "../components/PasteEditor.tsx";
import { useHydrated } from "../lib/hydration.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/paste/fork/$id")({
  loader: rindle.loader({
    query: ({ params }) => [
      pasteQuery(params.id),
      pastesQuery({ limit: PASTES_RECENT_LIMIT }, currentQueryContext()),
    ],
  }),
  component: ForkPaste,
});

function ForkPaste() {
  const { id } = Route.useParams();
  const { data: session, isPending } = authClient.useSession();
  const hydrated = useHydrated();
  if (!hydrated || isPending) return <p className="paste-empty">Opening paste…</p>;
  if (session?.user.role !== "admin") {
    return (
      <section className="paste-gate">
        <h1>Sign in to fork this paste.</h1>
        <Link to="/login">Open sign in →</Link>
      </section>
    );
  }
  return <ForkPasteEditor id={id} />;
}

function ForkPasteEditor({ id }: { id: string }) {
  const [source, { status }] = useRoot(pasteQuery, id);
  const [recent] = useRoot(
    pastesQuery,
    { limit: PASTES_RECENT_LIMIT },
    currentQueryContext(),
  );
  if (!source) return <p className="paste-empty">{status === "complete" ? "Paste not found." : "Loading paste…"}</p>;
  return <PasteEditor source={source} recent={recent.slice(0, PASTES_RECENT_LIMIT)} />;
}
