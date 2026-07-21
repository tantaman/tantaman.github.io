// Pathless layout (`_shell` adds NO URL segment) wrapping the blog list (`/`) and every post
// (`/$slug`). It owns the one posts-list subscription: because this route stays MATCHED while a post
// is open, the `postsQuery` IVM view is never released (Rindle evicts a view when its last subscriber
// unmounts), so Back to the list renders synchronous rows and scroll restoration works without timers.
//
// The list's SSR seed still lives on the index route's loader (a cold deep-link to a post stays lean —
// it doesn't ship the whole list); this layout only keeps the list warm on the client.

import { useCallback, useMemo, useRef, useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { POSTS_MAX_LIMIT, POSTS_PAGE_SIZE } from "../components/PostCard.queries.ts";
import { PostsListProvider, useFeaturedPostsRoot, usePostsListRoot } from "../components/PostsList.tsx";

export const Route = createFileRoute("/_shell")({
  component: BlogShell,
});

function BlogShell() {
  const [limit, setLimit] = useState(POSTS_PAGE_SIZE);
  const [postsWithLookahead, { status }] = usePostsListRoot(limit);
  const [featuredPosts, { status: featuredStatus }] = useFeaturedPostsRoot();
  const nextPosts = postsWithLookahead.slice(0, limit);
  const renderedPostsRef = useRef(nextPosts);

  // Changing `limit` opens a new named-query view. That view can be empty for one render while its
  // lease warms; keep the previous fragment refs mounted during that handoff so the document never
  // collapses and causes the browser to clamp the current scroll offset back to zero. Once complete,
  // always accept the exact result (including deletes); while loading, only accept growth.
  if (status === "complete" || nextPosts.length > renderedPostsRef.current.length) {
    renderedPostsRef.current = nextPosts;
  }

  const loadMore = useCallback(() => {
    setLimit((current) => Math.min(current + POSTS_PAGE_SIZE, POSTS_MAX_LIMIT));
  }, []);
  const postsList = useMemo(
    () => ({
      posts: renderedPostsRef.current,
      featuredPosts,
      status,
      featuredStatus,
      limit,
      hasMore: limit < POSTS_MAX_LIMIT && postsWithLookahead.length > limit,
      loadMore,
    }),
    [featuredPosts, featuredStatus, limit, loadMore, postsWithLookahead, status],
  );

  return (
    <PostsListProvider value={postsList}>
      <Outlet />
    </PostsListProvider>
  );
}
