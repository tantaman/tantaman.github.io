// Named, React-free post discussion window. The UI assembles these oldest-first flat rows into a
// reply tree; keeping the remote subscription flat avoids a fixed recursion depth in the query AST.

import { defineQuery } from "@rindle/client";
import type { QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { q, relationships } from "../../shared/app-def.ts";

export const POST_COMMENTS_PAGE_SIZE = 100;
export const POST_COMMENTS_MAX_LIMIT = 2_000;

const postCommentsArgs = z.object({
  postId: z
    .string()
    .min(1)
    .max(200)
    .refine((value) => value === value.trim(), "Post id must not have surrounding whitespace."),
  limit: z.number().int().min(POST_COMMENTS_PAGE_SIZE).max(POST_COMMENTS_MAX_LIMIT),
});

/** A bounded, ratcheting comment window. Parents are necessarily created before their replies, so
 * an oldest-first window never exposes a reply without first including its parent. */
export const postCommentsQuery = defineQuery(
  "postComments",
  (raw) => postCommentsArgs.parse(raw),
  ({ postId, limit }) =>
    q.postComment
      .where.postId(postId)
      .orderBy("createdAt", "asc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .countAs("replyCount", relationships.postCommentReplies)
      .select(
        "id",
        "postId",
        "authorId",
        "authorName",
        "parentId",
        "body",
        "createdAt",
        "deletedAt",
      ),
);

export type PostCommentRow = QueryLocalData<ReturnType<typeof postCommentsQuery>>[number];
