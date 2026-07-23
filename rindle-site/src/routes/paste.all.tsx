import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { authClient } from "../auth-client.ts";
import {
  PASTES_MAX_LIMIT,
  PASTES_PAGE_SIZE,
  pasteAdminFeedQuery,
  pastesQuery,
  type PasteListRow,
} from "../components/Paste.queries.ts";
import { PasteList } from "../components/PasteList.tsx";
import { useHydrated } from "../lib/hydration.ts";
import { rindle } from "../rindle-tanstack.ts";

export const Route = createFileRoute("/paste/all")({
  loader: rindle.loader({ ssr: () => pastesQuery({ limit: PASTES_PAGE_SIZE }) }),
  component: AllPastes,
});

function AllPastes() {
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  return hydrated && session?.user.role === "admin"
    ? <PasteWindow admin />
    : <PasteWindow />;
}

function PasteWindow({ admin = false }: { admin?: boolean }) {
  const [limit, setLimit] = useState(PASTES_PAGE_SIZE);
  return admin
    ? <AdminPasteWindow limit={limit} setLimit={setLimit} />
    : <PublicPasteWindow limit={limit} setLimit={setLimit} />;
}

function PublicPasteWindow({ limit, setLimit }: PasteWindowProps) {
  const [rows, { status }] = useRoot(pastesQuery, { limit });
  return <PasteWindowView rows={rows} status={status} limit={limit} setLimit={setLimit} />;
}

function AdminPasteWindow({ limit, setLimit }: PasteWindowProps) {
  const [rows, { status }] = useRoot(pasteAdminFeedQuery, { limit });
  return <PasteWindowView rows={rows} status={status} limit={limit} setLimit={setLimit} admin />;
}

interface PasteWindowProps {
  limit: number;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
}

function PasteWindowView({
  rows,
  status,
  limit,
  setLimit,
  admin = false,
}: PasteWindowProps & {
  rows: readonly PasteListRow[];
  status: string;
  admin?: boolean;
}) {
  const nextRows = rows.slice(0, limit);
  const renderedRef = useRef(nextRows);
  if (status === "complete" || nextRows.length > renderedRef.current.length) renderedRef.current = nextRows;
  const visible = renderedRef.current;
  const hasMore = limit < PASTES_MAX_LIMIT && rows.length > limit;

  return (
    <section className="paste-all-page">
      <header className="paste-page-heading">
        <p>{visible.length} paste{visible.length === 1 ? "" : "s"}</p>
        <h1>{admin ? "All pastes" : "Shared pastes"}</h1>
      </header>
      <PasteList rows={visible} empty={admin ? "No pastes yet." : "Nothing shared yet."} showShared={admin} />
      {hasMore || (visible.length > 0 && status !== "complete") ? (
        <div className="paste-load-more">
          <button
            className="paste-button paste-button--quiet"
            type="button"
            disabled={status !== "complete"}
            onClick={() => setLimit((current) => Math.min(current + PASTES_PAGE_SIZE, PASTES_MAX_LIMIT))}
          >
            {status === "complete" ? "Load more" : "Loading…"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
