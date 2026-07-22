import { useRef } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { DehydratedState, ResultType } from "@rindle/client";

import { ThoughtCard, type ThoughtCardData } from "../components/ThoughtCard.tsx";
import {
  THOUGHT_REPLIES_LIMIT,
  thoughtAdminQuery,
  thoughtQuery,
  type ThoughtAdminDetailRow,
  type ThoughtDetailRow,
} from "../components/ThoughtCard.queries.ts";
import { ThoughtComposer } from "../components/ThoughtComposer.tsx";
import { ThoughtHistory } from "../components/ThoughtHistory.tsx";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { shortThoughtId } from "../lib/thoughts.ts";

export const Route = createFileRoute("/thoughts/$id")({
  loader: async ({ params }): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtQuery(params.id)]) };
  },
  component: ThoughtThread,
});

function ThoughtThread() {
  const { id } = Route.useParams();
  const { isAdmin } = useThoughtsFeed();
  return isAdmin ? <AdminThoughtThread id={id} /> : <PublicThoughtThread id={id} />;
}

function PublicThoughtThread({ id }: { id: string }) {
  const [thought, { status }] = useRoot(thoughtQuery, id);
  return <StableThoughtThread id={id} thought={thought} status={status} isAdmin={false} />;
}

function AdminThoughtThread({ id }: { id: string }) {
  const [thought, { status }] = useRoot(thoughtAdminQuery, id);
  return <StableThoughtThread id={id} thought={thought} status={status} isAdmin />;
}

function StableThoughtThread({
  id,
  thought,
  status,
  isAdmin,
}: {
  id: string;
  thought: ThoughtDetailRow | ThoughtAdminDetailRow | null;
  status: ResultType;
  isAdmin: boolean;
}) {
  const navigate = Route.useNavigate();
  const renderedRef = useRef({ id, thought });
  if (renderedRef.current.id !== id || thought || status === "complete") {
    renderedRef.current = { id, thought };
  }
  const rendered = renderedRef.current.thought;

  if (!rendered) {
    return (
      <section className="thought-thread-page thought-thread-missing">
        <p>{status === "complete" ? "That thought is private, missing, or was deleted." : "Loading thread…"}</p>
        <Link className="app-link" to="/thoughts">← Back to thoughts</Link>
      </section>
    );
  }

  return (
    <section className="thought-thread-page">
      <div className="app-breadcrumb">
        <Link to="/thoughts">Thoughts</Link>
        <span aria-hidden="true">/</span>
        <span>#{shortThoughtId(rendered.id)}</span>
      </div>

      <ThoughtCard
        thought={rendered}
        isAdmin={isAdmin}
        variant="parent"
        onDeleted={() => void navigate({ to: "/thoughts" })}
      />

      <ThoughtHistory
        thought={rendered}
        updatedAt={rendered.updatedAt}
        history={rendered.history}
        isAdmin={isAdmin}
      />

      <section className="thought-replies" aria-labelledby="thought-replies-title">
        <header>
          <div>
            <p className="thoughts-kicker">thread</p>
            <h2 id="thought-replies-title">
              {rendered.replyCount === 0
                ? "No replies yet"
                : `${rendered.replyCount} ${rendered.replyCount === 1 ? "reply" : "replies"}`}
            </h2>
          </div>
          {rendered.replyCount > rendered.replies.length ? (
            <p>Showing the first {THOUGHT_REPLIES_LIMIT} replies.</p>
          ) : null}
        </header>

        {rendered.replies.length > 0 ? (
          <div className="thought-reply-list">
            {rendered.replies.map((reply) => (
              <ThoughtCard key={reply.id} thought={reply as ThoughtCardData} isAdmin={isAdmin} variant="reply" />
            ))}
          </div>
        ) : null}

        {isAdmin ? (
          <div className="thought-reply-composer">
            <ThoughtComposer
              parentId={rendered.id}
              parentTaskIds={rendered.tasks.map((task) => task.id)}
              defaultPrivate={rendered.private === 1}
              placeholder="Continue the thread…"
              submitLabel="Add reply"
              compact
            />
          </div>
        ) : null}
      </section>
    </section>
  );
}
