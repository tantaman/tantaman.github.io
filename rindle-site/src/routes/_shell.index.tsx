// The blog index (`/`): every ported post, newest-first. Its loader seeds the posts query for first
// paint (SSR); the LIST ITSELF is read from the `_shell` layout's context (`usePostsList`), which owns
// the subscription and keeps it warm across list↔post navigation. Fragment projection keeps this list
// off the big `html` column — the index ships only card fields.

import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fragmentKey } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { POSTS_PAGE_SIZE, postsQuery } from "../components/PostCard.queries.ts";
import { PostCard } from "../components/PostCard.tsx";
import { usePostsList } from "../components/PostsList.tsx";

export const Route = createFileRoute("/_shell/")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    // Dynamic import: ssr.ts is server-only (it builds the daemon client), so it must never enter the
    // client bundle. The static `import.meta.env.SSR` guard + this dynamic import keep it out.
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([postsQuery({ limit: POSTS_PAGE_SIZE })]) };
  },
  component: Home,
});

function Home() {
  const { posts, status, hasMore, loadMore } = usePostsList();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loading = status !== "complete" && posts.length === 0;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || status !== "complete" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore, status]);

  return (
    <>
      <section className="home-hero">
        <div className="hero-mark">
          <img src="/zero-knight.png" alt="" width={800} height={600} />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Tantamanlands</p>
          <h1 className="hero-title">Writing</h1>
          <p className="hero-sub">
            Essays on power, formation, religion, software, and the ground beneath modern life.
          </p>
        </div>
      </section>
      {loading ? (
        <p className="app-empty">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="app-empty">No posts yet — run `pnpm seed` to import them from ../content.</p>
      ) : (
        <>
          <ul className="post-list">
            {posts.map((post) => (
              <PostCard key={fragmentKey(post)} post={post} />
            ))}
          </ul>
          {hasMore || status !== "complete" ? (
            <div ref={loadMoreRef} className="post-list-more" aria-live="polite">
              <button
                type="button"
                className="load-more-button"
                onClick={loadMore}
                disabled={status !== "complete"}
              >
                {status === "complete" ? "Load more posts" : "Loading more posts…"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
