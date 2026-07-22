import { useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { DehydratedState, ResultType } from "@rindle/client";

import { ThoughtCard, type ThoughtCardData } from "../components/ThoughtCard.tsx";
import {
  THOUGHT_FEED_REPLIES_MAX_LIMIT,
  THOUGHT_FEED_REPLIES_PAGE_SIZE,
  THOUGHT_REPLIES_LIMIT,
  thoughtAdminQuery,
  thoughtAdminRepliesQuery,
  thoughtQuery,
  thoughtRepliesQuery,
  type ThoughtAdminDetailRow,
  type ThoughtDetailRow,
} from "../components/ThoughtCard.queries.ts";
import { ThoughtComposer } from "../components/ThoughtComposer.tsx";
import { ThoughtHistory } from "../components/ThoughtHistory.tsx";
import { buildThoughtForest, ThoughtReplyBranches } from "../components/ThoughtReplyTree.tsx";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";
import { shortThoughtId } from "../lib/thoughts.ts";

export const Route = createFileRoute("/thoughts/$id")({
  loader: async ({ params }): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return {
      rindle: await preloadRindle([
        thoughtQuery(params.id),
        thoughtRepliesQuery({ limit: THOUGHT_FEED_REPLIES_PAGE_SIZE }),
      ]),
    };
  },
  component: ThoughtThread,
});

function ThoughtThread() {
  const { id } = Route.useParams();
  const { isAdmin } = useThoughtsFeed();
  return isAdmin
    ? <AdminThoughtThread id={id} />
    : <PublicThoughtThread id={id} />;
}

function PublicThoughtThread({ id }: { id: string }) {
  const [replyLimit, setReplyLimit] = useState(THOUGHT_FEED_REPLIES_PAGE_SIZE);
  const [thought, { status }] = useRoot(thoughtQuery, id);
  const [allReplies, { status: replyStatus }] = useRoot(thoughtRepliesQuery, { limit: replyLimit });
  const visibleReplies = allReplies.slice(0, replyLimit);
  const renderedRepliesRef = useRef(visibleReplies);
  if (replyStatus === "complete" || visibleReplies.length > renderedRepliesRef.current.length) {
    renderedRepliesRef.current = visibleReplies;
  }
  return (
    <StableThoughtThread
      id={id}
      thought={thought}
      status={status}
      isAdmin={false}
      flatReplies={renderedRepliesRef.current}
      replyStatus={replyStatus}
      hasMoreReplies={replyLimit < THOUGHT_FEED_REPLIES_MAX_LIMIT && allReplies.length > replyLimit}
      loadMoreReplies={() => setReplyLimit((current) =>
        Math.min(current + THOUGHT_FEED_REPLIES_PAGE_SIZE, THOUGHT_FEED_REPLIES_MAX_LIMIT))}
      onReplyAdded={() => setReplyLimit(THOUGHT_FEED_REPLIES_MAX_LIMIT)}
    />
  );
}

function AdminThoughtThread({ id }: { id: string }) {
  const [replyLimit, setReplyLimit] = useState(THOUGHT_FEED_REPLIES_PAGE_SIZE);
  const [thought, { status }] = useRoot(thoughtAdminQuery, id);
  const [allReplies, { status: replyStatus }] = useRoot(thoughtAdminRepliesQuery, { limit: replyLimit });
  const visibleReplies = allReplies.slice(0, replyLimit);
  const renderedRepliesRef = useRef(visibleReplies);
  if (replyStatus === "complete" || visibleReplies.length > renderedRepliesRef.current.length) {
    renderedRepliesRef.current = visibleReplies;
  }
  return (
    <StableThoughtThread
      id={id}
      thought={thought}
      status={status}
      isAdmin
      flatReplies={renderedRepliesRef.current}
      replyStatus={replyStatus}
      hasMoreReplies={replyLimit < THOUGHT_FEED_REPLIES_MAX_LIMIT && allReplies.length > replyLimit}
      loadMoreReplies={() => setReplyLimit((current) =>
        Math.min(current + THOUGHT_FEED_REPLIES_PAGE_SIZE, THOUGHT_FEED_REPLIES_MAX_LIMIT))}
      onReplyAdded={() => setReplyLimit(THOUGHT_FEED_REPLIES_MAX_LIMIT)}
    />
  );
}

function StableThoughtThread({
  id,
  thought,
  status,
  isAdmin,
  flatReplies,
  replyStatus,
  hasMoreReplies,
  loadMoreReplies,
  onReplyAdded,
}: {
  id: string;
  thought: ThoughtDetailRow | ThoughtAdminDetailRow | null;
  status: ResultType;
  isAdmin: boolean;
  flatReplies: readonly ThoughtCardData[];
  replyStatus: ResultType;
  hasMoreReplies: boolean;
  loadMoreReplies: () => void;
  onReplyAdded: () => void;
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

  const thread = buildThoughtForest(
    [rendered as ThoughtCardData],
    [
      ...rendered.replies.map((reply) => reply as ThoughtCardData),
      ...flatReplies,
    ],
  )[0];
  const directReplies = thread?.children ?? [];

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
              {directReplies.length === 0
                ? "No replies yet"
                : `${directReplies.length} direct ${directReplies.length === 1 ? "reply" : "replies"}`}
            </h2>
          </div>
          {rendered.replyCount > directReplies.length ? (
            <p>Showing the first {THOUGHT_REPLIES_LIMIT} direct replies.</p>
          ) : null}
        </header>

        <ThoughtReplyBranches nodes={directReplies} isAdmin={isAdmin} onSubmitted={onReplyAdded} />

        {hasMoreReplies || (flatReplies.length > 0 && replyStatus !== "complete") ? (
          <div className="thought-replies-load-more" aria-live="polite">
            <button
              className="load-more-button"
              type="button"
              onClick={loadMoreReplies}
              disabled={replyStatus !== "complete"}
            >
              {replyStatus === "complete" ? "Load more replies" : "Loading more replies…"}
            </button>
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
              onDone={onReplyAdded}
            />
          </div>
        ) : null}
      </section>
    </section>
  );
}
