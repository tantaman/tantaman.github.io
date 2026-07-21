// The blog index (`/`): every ported post, newest-first. Its loader seeds the posts query for first
// paint (SSR); after hydration the wasm engine owns the live read, so a newly seeded/edited post
// appears with no reload. Fragment projection keeps this list off the big `html` column — the index
// ships only card fields.

import { createFileRoute } from "@tanstack/react-router";
import { fragmentKey, useRoot } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { PostCardFragment, postsQuery } from "../components/PostCard.queries.ts";
import { PostCard } from "../components/PostCard.tsx";

export const Route = createFileRoute("/")({
  loader: async (): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    // Dynamic import: ssr.ts is server-only (it builds the daemon client), so it must never enter the
    // client bundle. The static `import.meta.env.SSR` guard + this dynamic import keep it out.
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([postsQuery()]) };
  },
  component: Home,
});

function Home() {
  const [posts, { status }] = useRoot(postsQuery, PostCardFragment);
  const loading = status !== "complete" && posts.length === 0;

  return (
    <section className="app-page">
      <div className="app-page-head">
        <p className="app-eyebrow">Tantamanlands</p>
        <h1>Writing</h1>
      </div>
      {loading ? (
        <p className="app-empty">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="app-empty">No posts yet — run `pnpm seed` to import them from ../content.</p>
      ) : (
        <ul className="post-list">
          {posts.map((post) => (
            <PostCard key={fragmentKey(post)} post={post} />
          ))}
        </ul>
      )}
    </section>
  );
}
