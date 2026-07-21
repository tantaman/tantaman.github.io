// The blog list, hoisted to a React context so the `_shell` layout route can OWN the one
// `postsQuery` subscription and children can read it.
//
// Why a context instead of each route calling `useRoot` itself: Rindle evicts a local IVM view when
// its LAST subscriber unmounts (@rindle/react useRootRefData — "eviction-on-release still drops a cold
// view; a release TTL … is future work"). If the index route were the sole lease-holder, opening a
// post would unmount it, evict the list, and Back would re-materialize cold — a loading flash and a
// scroll-restoration race. The `_shell` layout stays MATCHED while a post is open, so holding the
// subscription here keeps the view warm; Back renders synchronous rows.

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useRoot } from "@rindle/react";

import { PostCardFragment, postsQuery } from "./PostCard.queries.ts";

/** Subscribe to the newest-first posts list (card fragment refs + a load status). Call ONCE, in the
 *  layout route, so there's a single continuously-mounted lease-holder. */
export function usePostsListRoot() {
  return useRoot(postsQuery, PostCardFragment);
}

/** The `[refs, { status }]` tuple `usePostsListRoot()` returns — shared verbatim through context. */
export type PostsListValue = ReturnType<typeof usePostsListRoot>;

const PostsListContext = createContext<PostsListValue | null>(null);

export function PostsListProvider({ value, children }: { value: PostsListValue; children: ReactNode }) {
  return <PostsListContext.Provider value={value}>{children}</PostsListContext.Provider>;
}

/** Read the list the `_shell` layout keeps warm. Throws if used outside that layout (a wiring bug). */
export function usePostsList(): PostsListValue {
  const value = useContext(PostsListContext);
  if (!value) throw new Error("usePostsList() must be used within the `_shell` blog layout route.");
  return value;
}
