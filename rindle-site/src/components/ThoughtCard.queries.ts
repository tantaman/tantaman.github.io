// Named, React-free subscriptions for the short-form thought substrate. Visibility comes from the
// off-wire query context: the browser predicts with its session principal and the API rebuilds the
// same named query with its independently verified principal.

import { defineFragment, defineQuery, isNotNull, isNull } from "@rindle/client";
import type { FragmentRef, QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { q, relationships, thought } from "../../shared/app-def.ts";
import { canPublish, type QueryContext } from "../../shared/auth.ts";

export const ThoughtCardFragment = defineFragment(thought, (t) =>
  t.select("id", "body", "createdAt", "updatedAt", "version", "parentId", "color", "private"),
);
export type ThoughtCardRef = FragmentRef<typeof ThoughtCardFragment>;

export const THOUGHTS_PAGE_SIZE = 40;
export const THOUGHTS_MAX_LIMIT = 1_000;
export const THOUGHT_REPLIES_LIMIT = 500;
export const THOUGHT_FEED_REPLIES_PAGE_SIZE = 500;
export const THOUGHT_FEED_REPLIES_MAX_LIMIT = 5_000;

const pageArgs = z.object({
  limit: z.number().int().min(THOUGHTS_PAGE_SIZE).max(THOUGHTS_MAX_LIMIT),
});

const replyPageArgs = z.object({
  limit: z
    .number()
    .int()
    .min(THOUGHT_FEED_REPLIES_PAGE_SIZE)
    .max(THOUGHT_FEED_REPLIES_MAX_LIMIT),
});

/** Root-thought feed. The lookahead row supports ratcheting "load more" without subscribing to the
 * whole table. Anonymous readers get public rows/counts; publishers get the widened author view. */
export const thoughtsQuery = defineQuery(
  "thoughts",
  (raw) => pageArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => {
    const admin = canPublish(ctx.user);
    let query = q.thought.where.parentId(isNull());
    if (!admin) query = query.where.private(0);
    return query
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .countAs("replyCount", relationships.thoughtReplies, (reply) =>
        admin ? reply : reply.where.private(0),
      )
      .sub("attachments", relationships.thoughtAttachments, (attachment) =>
        attachment
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(100)
          .select("id", "thoughtId", "storageKey", "mediaType", "fileName", "position"),
      )
      .sub("tagLinks", relationships.thoughtTagLinks, (link) =>
        link
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(200)
          .select("id", "thoughtId", "tagId", "position")
          .sub("tag", relationships.thoughtTagProfile, (tagProfile) =>
            tagProfile.select("id", "name", "normalizedName").one(),
          ),
      )
      .sub("tasks", relationships.thoughtTasks, (task) =>
        task.orderBy("id", "asc").limit(200).select("id"),
      )
      .include(ThoughtCardFragment);
  },
);

/** Public flat reply window. The UI joins these rows to the separately bounded root window and
 * recursively assembles the hierarchy; a flat remote shape avoids fixing a maximum reply depth in
 * the query AST. Oldest-first guarantees every loaded descendant follows its loaded parent. */
export const thoughtRepliesQuery = defineQuery(
  "thoughtReplies",
  (raw) => replyPageArgs.parse(raw),
  ({ limit }, ctx: QueryContext) => {
    const admin = canPublish(ctx.user);
    let query = q.thought.where.parentId(isNotNull());
    if (!admin) query = query.where.private(0);
    return query
      .orderBy("createdAt", "asc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .countAs("replyCount", relationships.thoughtReplies, (reply) =>
        admin ? reply : reply.where.private(0),
      )
      .sub("attachments", relationships.thoughtAttachments, (attachment) =>
        attachment
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(100)
          .select("id", "thoughtId", "storageKey", "mediaType", "fileName", "position"),
      )
      .sub("tagLinks", relationships.thoughtTagLinks, (link) =>
        link
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(200)
          .select("id", "thoughtId", "tagId", "position")
          .sub("tag", relationships.thoughtTagProfile, (tagProfile) =>
            tagProfile.select("id", "name", "normalizedName").one(),
          ),
      )
      .sub("tasks", relationships.thoughtTasks, (task) =>
        task.orderBy("id", "asc").limit(200).select("id"),
      )
      .include(ThoughtCardFragment);
  },
);

const thoughtIdArgs = z.string().min(1).max(500);

/** One thought, its direct reply window, attachments, normalized tags, and recent version history.
 * The authoritative principal decides whether private roots, replies, and counts enter the view. */
export const thoughtQuery = defineQuery(
  "thought",
  (raw) => thoughtIdArgs.parse(raw),
  (id, ctx: QueryContext) => {
    const admin = canPublish(ctx.user);
    let query = q.thought.where.id(id);
    if (!admin) query = query.where.private(0);
    return query
      .countAs("replyCount", relationships.thoughtReplies, (reply) =>
        admin ? reply : reply.where.private(0),
      )
      .sub("attachments", relationships.thoughtAttachments, (attachment) =>
        attachment.orderBy("position", "asc").orderBy("id", "asc").limit(100),
      )
      .sub("tagLinks", relationships.thoughtTagLinks, (link) =>
        link
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(200)
          .select("id", "thoughtId", "tagId", "position")
          .sub("tag", relationships.thoughtTagProfile, (tagProfile) =>
            tagProfile.select("id", "name", "normalizedName").one(),
          ),
      )
      .sub("history", relationships.thoughtHistory, (history) =>
        history.orderBy("version", "desc").orderBy("id", "asc").limit(500),
      )
      .sub("tasks", relationships.thoughtTasks, (task) =>
        task.orderBy("id", "asc").limit(200).select("id", "projectId"),
      )
      .sub("projects", relationships.thoughtProjects, (project) =>
        project.orderBy("id", "asc").limit(200).select("id", "status"),
      )
      .sub("replies", relationships.thoughtReplies, (reply) => {
        const visible = admin ? reply : reply.where.private(0);
        return visible
          .orderBy("createdAt", "asc")
          .orderBy("id", "asc")
          .limit(THOUGHT_REPLIES_LIMIT)
          .countAs("replyCount", relationships.thoughtReplies, (nestedReply) =>
            admin ? nestedReply : nestedReply.where.private(0),
          )
          .sub("attachments", relationships.thoughtAttachments, (attachment) =>
            attachment.orderBy("position", "asc").orderBy("id", "asc").limit(100),
          )
          .sub("tagLinks", relationships.thoughtTagLinks, (link) =>
            link
              .orderBy("position", "asc")
              .orderBy("id", "asc")
              .limit(200)
              .select("id", "thoughtId", "tagId", "position")
              .sub("tag", relationships.thoughtTagProfile, (tagProfile) =>
                tagProfile.select("id", "name", "normalizedName").one(),
              ),
          )
          .select("id", "body", "createdAt", "updatedAt", "version", "parentId", "color", "private");
      })
      .include(ThoughtCardFragment)
      .one();
  },
);

export type ThoughtFeedRow = QueryLocalData<ReturnType<typeof thoughtsQuery>>[number];
export type ThoughtReplyRow = QueryLocalData<ReturnType<typeof thoughtRepliesQuery>>[number];
export type ThoughtDetailRow = NonNullable<QueryLocalData<ReturnType<typeof thoughtQuery>>>;
