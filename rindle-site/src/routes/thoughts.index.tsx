import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { ThoughtCard } from "../components/ThoughtCard.tsx";
import { THOUGHTS_PAGE_SIZE, thoughtsQuery } from "../components/ThoughtCard.queries.ts";
import { ThoughtComposer } from "../components/ThoughtComposer.tsx";
import { useThoughtsFeed } from "../components/ThoughtsFeed.tsx";

export const Route = createFileRoute("/thoughts/")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([thoughtsQuery({ limit: THOUGHTS_PAGE_SIZE })]) };
  },
  component: ThoughtsIndex,
});

function ThoughtsIndex() {
  const { thoughts, status, isAdmin, hasMore, loadMore } = useThoughtsFeed();
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
          {thoughts.map((thought) => (
            <ThoughtCard key={thought.id} thought={thought} isAdmin={isAdmin} />
          ))}
        </div>
      )}

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
