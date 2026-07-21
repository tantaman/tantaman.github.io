// Co-located with the post-detail view. Holds the detail SELECTION (`PostDetailFragment`) AND the named
// root query that fetches one post by slug on demand (`postQuery`). React-free.
//
// Unlike the index card, the detail fragment DOES select `html` (the pre-rendered article body) plus the
// full frontmatter facets, so a single narrow by-id read hydrates the whole page.

import { defineFragment, defineQuery } from "@rindle/client";
import type { FragmentRef } from "@rindle/client";
import { z } from "zod";

import { post, q } from "../../shared/app-def.ts";

/** What the POST VIEW renders: the chrome (title, date, facets, hero image) plus the rendered `html`.
 *  `tags`/`concern`/`author` are JSON strings (see the migration); the view parses them. */
export const PostDetailFragment = defineFragment(post, (p) =>
  p.select(
    "id",
    "title",
    "date",
    "publishedAt",
    "description",
    "tags",
    "concern",
    "author",
    "form",
    "kind",
    "image",
    "html",
  ),
);
export type PostDetailRef = FragmentRef<typeof PostDetailFragment>;

/** The post view's only arg: a slug (the post's `id` / URL path segment). */
const slugArgs = z.string().max(200);

/** A single post resolved by slug, with its rendered body (`PostDetailFragment`). */
export const postQuery = defineQuery("post", (raw) => slugArgs.parse(raw), (slug) =>
  q.post.where.id(slug).include(PostDetailFragment).one(),
);
