// Co-located with the post card on the blog index. Holds the per-card SELECTION (`PostCardFragment`)
// AND the named root query over the post table (`postsQuery`). React-free, so the API authority and the
// SSR loader can import it for query resolution without pulling in React.
//
// The card deliberately does NOT select `html`/`body` (the big columns): fragment projection means the
// index subscription ships only the card fields, never a post's rendered body. The detail view opens a
// separate narrow read for the body (PostView.queries.ts).

import { defineFragment, defineQuery } from "@rindle/client";
import type { FragmentRef } from "@rindle/client";

import { post, q } from "../../shared/app-def.ts";

/** The blog-index card selection: enough to render a list entry — never the rendered `html`. `tags` is
 *  a JSON string (see the migration); the card parses it lazily. */
export const PostCardFragment = defineFragment(post, (p) =>
  p.select("id", "title", "date", "publishedAt", "description", "tags", "form", "kind"),
);
export type PostCardRef = FragmentRef<typeof PostCardFragment>;

/** Every post, newest-first (`publishedAt` desc, id as the total-order tiebreak). A bounded window
 *  (rule 6: subscribe to windows, not whole tables) — 500 covers the whole ported corpus; add a `limit`
 *  arg + "load more" if the archive outgrows it. No args, so no validator. */
export const postsQuery = defineQuery("posts", () =>
  q.post.orderBy("publishedAt", "desc").orderBy("id", "asc").limit(500).include(PostCardFragment),
);
