// Pathless layout (`_shell` adds NO URL segment) wrapping the blog list (`/`) and every post
// (`/$slug`). It owns the one posts-list subscription: because this route stays MATCHED while a post
// is open, the `postsQuery` IVM view is never released (Rindle evicts a view when its last subscriber
// unmounts), so Back to the list renders synchronous rows and scroll restoration works without timers.
//
// The list's SSR seed still lives on the index route's loader (a cold deep-link to a post stays lean —
// it doesn't ship the whole list); this layout only keeps the list warm on the client.

import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PostsListProvider, usePostsListRoot } from "../components/PostsList.tsx";

export const Route = createFileRoute("/_shell")({
  component: BlogShell,
});

function BlogShell() {
  const postsList = usePostsListRoot();
  return (
    <PostsListProvider value={postsList}>
      <Outlet />
    </PostsListProvider>
  );
}
