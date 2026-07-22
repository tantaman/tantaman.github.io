import { useEffect, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import {
  THOUGHT_FEED_REPLIES_PAGE_SIZE,
  THOUGHTS_PAGE_SIZE,
  thoughtRepliesQuery,
  thoughtsQuery,
} from "../components/ThoughtCard.queries.ts";
import { ThoughtComposer } from "../components/ThoughtComposer.tsx";
import { buildThoughtForest, ThoughtFeedThread } from "../components/ThoughtReplyTree.tsx";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";

export const Route = createFileRoute("/thoughts/")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return {
      rindle: await preloadRindle([
        thoughtsQuery({ limit: THOUGHTS_PAGE_SIZE }),
        thoughtRepliesQuery({ limit: THOUGHT_FEED_REPLIES_PAGE_SIZE }),
      ]),
    };
  },
  component: ThoughtsIndex,
});

function ThoughtsIndex() {
  const {
    thoughts,
    replies,
    status,
    replyStatus,
    isAdmin,
    hasMore,
    hasMoreReplies,
    loadMore,
    loadMoreReplies,
    revealNewestReplies,
  } = useThoughtsFeed();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const threads = useMemo(() => buildThoughtForest(thoughts, replies), [replies, thoughts]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || status !== "complete" || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, status]);

  const loading = thoughts.length === 0 && status !== "complete";

  return (
    <section className="thoughts-page">
      <header className="thoughts-page-head">
        <div>
          <p className="thoughts-kicker">field notes</p>
          <h1>Thoughts</h1>
        </div>
        <p>Fragments, observations, and unfinished ideas. Small enough to stay alive.</p>
      </header>

      {isAdmin ? (
        <div className="thoughts-compose-wrap">
          <ThoughtComposer autoFocus />
        </div>
      ) : null}

      {loading ? (
        <div className="thoughts-loading" aria-live="polite">
          <span aria-hidden="true" /> Loading thoughts…
        </div>
      ) : thoughts.length === 0 ? (
        <div className="thoughts-empty">
          <span aria-hidden="true">◇</span>
          <p>{isAdmin ? "No thoughts yet." : "No public thoughts yet."}</p>
        </div>
      ) : (
        <div className="thoughts-list">
          {threads.map((thread) => (
            <ThoughtFeedThread
              key={thread.thought.id}
              node={thread}
              isAdmin={isAdmin}
              onSubmitted={revealNewestReplies}
            />
          ))}
        </div>
      )}

      {hasMoreReplies || (replies.length > 0 && replyStatus !== "complete") ? (
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

      {hasMore || (thoughts.length > 0 && status !== "complete") ? (
        <div ref={loadMoreRef} className="thoughts-load-more" aria-live="polite">
          <button className="load-more-button" type="button" onClick={loadMore} disabled={status !== "complete"}>
            {status === "complete" ? "Load more thoughts" : "Loading more thoughts…"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
