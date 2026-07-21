// The blog index (`/`): every ported post, newest-first. Its loader seeds the posts query for first
// paint (SSR); the LIST ITSELF is read from the `_shell` layout's context (`usePostsList`), which owns
// the subscription and keeps it warm across list↔post navigation. Fragment projection keeps this list
// off the big `html` column — the index ships only card fields.

import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fragmentKey } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { featuredPostsQuery, POSTS_PAGE_SIZE, postsQuery } from "../components/PostCard.queries.ts";
import { FeaturedPostCard } from "../components/FeaturedPostCard.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { usePostsList } from "../components/PostsList.tsx";

export const Route = createFileRoute("/_shell/")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    // Dynamic import: ssr.ts is server-only (it builds the daemon client), so it must never enter the
    // client bundle. The static `import.meta.env.SSR` guard + this dynamic import keep it out.
    const { preloadRindle } = await import("../ssr.ts");
    return {
      rindle: await preloadRindle([
        postsQuery({ limit: POSTS_PAGE_SIZE }),
        featuredPostsQuery({}),
      ]),
    };
  },
  component: Home,
});

function Home() {
  const { posts, featuredPosts, status, featuredStatus, hasMore, loadMore } = usePostsList();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loading =
    posts.length === 0 &&
    featuredPosts.length === 0 &&
    (status !== "complete" || featuredStatus !== "complete");
  const featuredKeys = new Set(featuredPosts.map((post) => fragmentKey(post)));
  const regularPosts = posts.filter((post) => !featuredKeys.has(fragmentKey(post)));

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
    <section className="home-page">
      {loading ? (
        <p className="app-empty">Loading posts…</p>
      ) : posts.length === 0 && featuredPosts.length === 0 ? (
        <p className="app-empty">No posts yet — run `pnpm seed` to import them from ../content.</p>
      ) : (
        <>
          {featuredPosts.length > 0 ? (
            <ul className="featured-post-list">
              {featuredPosts.map((post, index) => (
                <FeaturedPostCard key={fragmentKey(post)} post={post} priority={index === 0} />
              ))}
            </ul>
          ) : null}
          <ul className="post-list">
            {regularPosts.map((post) => (
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
    </section>
  );
}
