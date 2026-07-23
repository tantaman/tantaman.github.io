// Named, React-free paste subscriptions shared by the browser, API authority, and SSR loaders.
// Feed visibility comes from off-wire query context. Detail reads preserve the legacy paste-bin
// contract: possession of an unlisted paste URL is enough to read it, while only the author can
// mutate its sharing state.

import { defineFragment, defineQuery, notExists } from "@rindle/client";
import type { FragmentRef, QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { paste, q, relationships } from "../../shared/app-def.ts";
import { canPublish, type QueryContext } from "../../shared/auth.ts";

export const PasteListFragment = defineFragment(paste, (p) =>
  p.select("id", "title", "excerpt", "language", "createdAt", "parentId", "shared", "sharedAt"),
);
export type PasteListRef = FragmentRef<typeof PasteListFragment>;

export const PASTES_PAGE_SIZE = 40;
export const PASTES_MAX_LIMIT = 1_000;
export const PASTES_RECENT_LIMIT = 5;
export const PASTE_FORKS_LIMIT = 500;

const pageArgs = z.object({
  limit: z.number().int().min(1).max(PASTES_MAX_LIMIT),
});

/** Newest leaf window. Readers get explicitly shared rows ordered by share time; publishers get the
 * complete authoring window ordered by creation time. A live NOT EXISTS removes superseded rows. */
export const pastesQuery = defineQuery(
  "pastes",
  (raw) => pageArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => {
    if (canPublish(ctx.user)) {
      return q.paste
        .where(notExists(relationships.pasteChildren))
        .orderBy("createdAt", "desc")
        .orderBy("id", "asc")
        .limit(limit + 1)
        .include(PasteListFragment);
    }
    return q.paste
      .where.shared(1)
      .where(notExists(relationships.pasteChildren))
      .orderBy("sharedAt", "desc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .include(PasteListFragment);
  },
);

const pasteIdArgs = z.string().min(1).max(500);

/** One paste plus its immediate revision context. The full body is confined to this narrow by-id
 * view; feed windows carry only the precomputed excerpt. */
export const pasteQuery = defineQuery("paste", (raw) => pasteIdArgs.parse(raw), (id) =>
  q.paste
    .where.id(id)
    .select("id", "body", "language", "title", "excerpt", "createdAt", "parentId", "shared", "sharedAt")
    .sub("parent", relationships.pasteParent, (parent) =>
      parent.limit(1).select("id", "title", "createdAt", "parentId"),
    )
    .sub("children", relationships.pasteChildren, (child) =>
      child
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(PASTE_FORKS_LIMIT)
        .select("id", "title", "createdAt", "parentId"),
    )
    .one(),
);

/** The diff screen needs both complete bodies before it can paint. Keeping that dependency in one
 * named view avoids committing the route after the child arrives only to flash while a second
 * parent subscription warms. */
export const pasteDiffQuery = defineQuery("pasteDiff", (raw) => pasteIdArgs.parse(raw), (id) =>
  q.paste
    .where.id(id)
    .select("id", "body", "language", "title", "excerpt", "createdAt", "parentId", "shared", "sharedAt")
    .sub("parent", relationships.pasteParent, (parent) =>
      parent
        .limit(1)
        .select("id", "body", "language", "title", "excerpt", "createdAt", "parentId", "shared", "sharedAt"),
    )
    .one(),
);

export type PasteListRow = QueryLocalData<ReturnType<typeof pastesQuery>>[number];
export type PasteDetailRow = NonNullable<QueryLocalData<ReturnType<typeof pasteQuery>>>;
export type PasteDiffRow = NonNullable<QueryLocalData<ReturnType<typeof pasteDiffQuery>>>;
