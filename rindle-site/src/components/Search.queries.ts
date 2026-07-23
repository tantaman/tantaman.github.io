// Unified search candidates. Search is expressed as three bounded named Rindle views rather than a
// generated site-wide JSON index: the daemon evaluates text and principal-scoped visibility, then
// syncs only matching rows while the browser merges and ranks the three result kinds.

import { defineQuery, ilike, notExists, or } from "@rindle/client";
import type { QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { paste, post, q, relationships, thought } from "../../shared/app-def.ts";
import { canPublish, type QueryContext } from "../../shared/auth.ts";

export const SEARCH_PAGE_SIZE = 24;
export const SEARCH_MAX_LIMIT = 96;
const SEARCH_MAX_TERMS = 8;
const EMPTY_SEARCH_ID = "\u0000search";

const searchArgs = z.object({
  search: z.string().max(200),
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT),
});

/** LIKE treats `%`, `_`, and `\` as syntax. Search input treats them literally. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Cap the AST as well as the wire input: pasting a paragraph must not create hundreds of filters. */
function terms(search: string): string[] {
  return search.trim().split(/\s+/u).filter(Boolean).slice(0, SEARCH_MAX_TERMS);
}

export const searchPostsQuery = defineQuery(
  "searchPosts",
  (raw) => searchArgs.parse(raw),
  ({ search, limit }) => {
    const needles = terms(search);
    let root = q.post;
    if (needles.length === 0) root = root.where.id(EMPTY_SEARCH_ID);
    for (const needle of needles) {
      const pattern = ilike(likePattern(needle));
      root = root.where(or(
        post.title(pattern),
        post.description(pattern),
        post.body(pattern),
        post.tags(pattern),
        post.concern(pattern),
      ));
    }
    return root
      .orderBy("publishedAt", "desc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .select("id", "title", "date", "publishedAt", "description", "body", "tags", "concern", "color");
  },
);

export const searchThoughtsQuery = defineQuery(
  "searchThoughts",
  (raw) => searchArgs.parse(raw),
  ({ search, limit }, ctx: QueryContext) => {
    const needles = terms(search);
    let root = q.thought;
    if (!canPublish(ctx.user)) root = root.where.private(0);
    if (needles.length === 0) root = root.where.id(EMPTY_SEARCH_ID);
    for (const needle of needles) root = root.where.body(ilike(likePattern(needle)));
    return root
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .select("id", "body", "createdAt", "updatedAt", "color");
  },
);

export const searchPastesQuery = defineQuery(
  "searchPastes",
  (raw) => searchArgs.parse(raw),
  ({ search, limit }, ctx: QueryContext) => {
    const needles = terms(search);
    const admin = canPublish(ctx.user);
    let root = q.paste.where(notExists(relationships.pasteChildren));
    if (!admin) root = root.where.shared(1);
    if (needles.length === 0) root = root.where.id(EMPTY_SEARCH_ID);
    for (const needle of needles) {
      const pattern = ilike(likePattern(needle));
      root = root.where(or(
        paste.body(pattern),
        paste.excerpt(pattern),
        paste.language(pattern),
      ));
    }
    return root
      .orderBy(admin ? "createdAt" : "sharedAt", "desc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .select("id", "title", "body", "excerpt", "language", "createdAt", "sharedAt");
  },
);

export type SearchPostRow = QueryLocalData<ReturnType<typeof searchPostsQuery>>[number];
export type SearchThoughtRow = QueryLocalData<ReturnType<typeof searchThoughtsQuery>>[number];
export type SearchPasteRow = QueryLocalData<ReturnType<typeof searchPastesQuery>>[number];
