// Co-located with the post card on the blog index. Holds the per-card SELECTION (`PostCardFragment`)
// AND the named root query over the post table (`postsQuery`). React-free, so the API authority and the
// SSR loader can import it for query resolution without pulling in React.
//
// The card deliberately does NOT select `html`/`body` (the big columns): fragment projection means the
// index subscription ships only the card fields, never a post's rendered body. The detail view opens a
// separate narrow read for the body (PostView.queries.ts).

import { defineFragment, defineQuery } from "@rindle/client";
import type { FragmentRef } from "@rindle/client";
import { z } from "zod";

import { post, q } from "../../shared/app-def.ts";

/** The blog-index card selection: enough to render a list entry — never the rendered `html`. `tags` is
 *  a JSON string (see the migration); the card parses it lazily. */
export const PostCardFragment = defineFragment(post, (p) =>
  p.select(
    "id",
    "title",
    "date",
    "publishedAt",
    "description",
    "thesis",
    "tags",
    "concern",
    "author",
    "form",
    "kind",
    "cardImage",
    "color",
    "pinned",
    "readingMinutes",
  ),
);
export type PostCardRef = FragmentRef<typeof PostCardFragment>;

export const POSTS_PAGE_SIZE = 50;
export const POSTS_MAX_LIMIT = 1_000;
export const FEATURED_POSTS_COUNT = 3;

const postsArgs = z.object({
  limit: z.number().int().min(POSTS_PAGE_SIZE).max(POSTS_MAX_LIMIT),
});

/** Newest-first posts (`publishedAt` desc, id as the total-order tiebreak) in a bounded, ratcheting
 *  window. The extra lookahead row lets the index tell whether another page exists without a second
 *  count subscription; it is not rendered until the caller raises `limit`. */
export const postsQuery = defineQuery("posts", (raw) => postsArgs.parse(raw), ({ limit }) =>
  q.post
    .orderBy("pinned", "desc")
    .orderBy("publishedAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .include(PostCardFragment),
);

const featuredPostsArgs = z.object({});

/** The three newest non-pinned posts get the original site's full-width image treatment. Keeping
 *  this as its own named, bounded query means a new post enters the featured window immediately. */
export const featuredPostsQuery = defineQuery(
  "featuredPosts",
  (raw) => featuredPostsArgs.parse(raw),
  () =>
    q.post
      .where.pinned(0)
      .orderBy("publishedAt", "desc")
      .orderBy("id", "asc")
      .limit(FEATURED_POSTS_COUNT)
      .include(PostCardFragment),
);
