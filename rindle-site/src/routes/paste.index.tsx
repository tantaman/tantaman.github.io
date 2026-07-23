import { createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { authClient } from "../auth-client.ts";
import {
  PASTES_RECENT_LIMIT,
  pasteAdminFeedQuery,
  pastesQuery,
} from "../components/Paste.queries.ts";
import { PasteEditor } from "../components/PasteEditor.tsx";
import { PasteList } from "../components/PasteList.tsx";
import { useHydrated } from "../lib/hydration.ts";
import { rindle } from "../rindle-tanstack.ts";

const PUBLIC_LIMIT = 20;

export const Route = createFileRoute("/paste/")({
  loader: rindle.loader({ ssr: () => pastesQuery({ limit: PUBLIC_LIMIT }) }),
  component: PasteHome,
});

function PasteHome() {
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  return hydrated && session?.user.role === "admin"
    ? <PasteAuthorHome />
    : <PublicPasteHome />;
}

function PasteAuthorHome() {
  const [rows] = useRoot(pasteAdminFeedQuery, { limit: PASTES_RECENT_LIMIT });
  return <PasteEditor recent={rows.slice(0, PASTES_RECENT_LIMIT)} />;
}

function PublicPasteHome() {
  const [rows, { status }] = useRoot(pastesQuery, { limit: PUBLIC_LIMIT });
  const visible = rows.slice(0, PUBLIC_LIMIT);
  return (
    <section className="paste-landing">
      <header className="paste-page-heading">
        <p>shared snippets</p>
        <h1>paste</h1>
      </header>
      {status !== "complete" && visible.length === 0 ? (
        <p className="paste-empty">Loading pastes…</p>
      ) : (
        <PasteList rows={visible} empty="Nothing shared yet." showExcerpt />
      )}
    </section>
  );
}
