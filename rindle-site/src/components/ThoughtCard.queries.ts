// Named, React-free subscriptions for the short-form thought substrate. Public query names always
// constrain `private = 0`; admin query names are separately authorized by server/app-api.ts rather
// than trusting a client-provided "include private" flag.

import { defineFragment, defineQuery } from "@rindle/client";
import type { FragmentRef } from "@rindle/client";
import { z } from "zod";

import { q, relationships, thought } from "../../shared/app-def.ts";

export const ThoughtCardFragment = defineFragment(thought, (t) =>
  t.select("id", "body", "createdAt", "updatedAt", "version", "parentId", "color", "private"),
);
export type ThoughtCardRef = FragmentRef<typeof ThoughtCardFragment>;

export const THOUGHTS_PAGE_SIZE = 40;
export const THOUGHTS_MAX_LIMIT = 1_000;
export const THOUGHT_REPLIES_LIMIT = 500;

const pageArgs = z.object({
  limit: z.number().int().min(THOUGHTS_PAGE_SIZE).max(THOUGHTS_MAX_LIMIT),
});

/** Public root-thought feed. The lookahead row supports ratcheting "load more" without subscribing
 * to the whole table. replyCount excludes private replies for anonymous readers. */
export const thoughtsQuery = defineQuery("thoughts", (raw) => pageArgs.parse(raw), ({ limit }) =>
  q.thought
    .where.parentId(null)
    .where.private(0)
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .countAs("replyCount", relationships.thoughtReplies, (reply) => reply.where.private(0))
    .sub("attachments", relationships.thoughtAttachments, (attachment) =>
      attachment
        .orderBy("position", "asc")
        .orderBy("id", "asc")
        .limit(100)
        .select("id", "thoughtId", "storageKey", "mediaType", "fileName", "position"),
    )
    .include(ThoughtCardFragment),
);

/** Private author feed. Authorization is by the query name, so its AST never depends on a spoofable
 * wire flag. */
export const thoughtAdminFeedQuery = defineQuery(
  "thoughtAdminFeed",
  (raw) => pageArgs.parse(raw),
  ({ limit }) =>
    q.thought
      .where.parentId(null)
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(limit + 1)
      .countAs("replyCount", relationships.thoughtReplies)
      .sub("attachments", relationships.thoughtAttachments, (attachment) =>
        attachment
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(100)
          .select("id", "thoughtId", "storageKey", "mediaType", "fileName", "position"),
      )
      .include(ThoughtCardFragment),
);

const thoughtIdArgs = z.string().min(1).max(500);

/** A public thought, its direct reply window, attachments, normalized tags, and complete version
 * history. Filtering the root by privacy also gates the nested history rows. */
export const thoughtQuery = defineQuery("thought", (raw) => thoughtIdArgs.parse(raw), (id) =>
  q.thought
    .where.id(id)
    .where.private(0)
    .countAs("replyCount", relationships.thoughtReplies, (reply) => reply.where.private(0))
    .sub("attachments", relationships.thoughtAttachments, (attachment) =>
      attachment.orderBy("position", "asc").orderBy("id", "asc").limit(100),
    )
    .sub("tagLinks", relationships.thoughtTagLinks, (link) =>
      link
        .orderBy("position", "asc")
        .orderBy("id", "asc")
        .limit(200)
        .sub("tag", relationships.thoughtTagProfile, (tagProfile) => tagProfile.limit(1)),
    )
    .sub("history", relationships.thoughtHistory, (history) =>
      history.orderBy("version", "asc").orderBy("id", "asc").limit(500),
    )
    .sub("replies", relationships.thoughtReplies, (reply) =>
      reply
        .where.private(0)
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(THOUGHT_REPLIES_LIMIT)
        .countAs("replyCount", relationships.thoughtReplies, (nestedReply) => nestedReply.where.private(0))
        .sub("attachments", relationships.thoughtAttachments, (attachment) =>
          attachment.orderBy("position", "asc").orderBy("id", "asc").limit(100),
        )
        .include(ThoughtCardFragment),
    )
    .include(ThoughtCardFragment)
    .one(),
);

/** Admin detail twin: identical shape, without privacy filters. */
export const thoughtAdminQuery = defineQuery(
  "thoughtAdmin",
  (raw) => thoughtIdArgs.parse(raw),
  (id) =>
    q.thought
      .where.id(id)
      .countAs("replyCount", relationships.thoughtReplies)
      .sub("attachments", relationships.thoughtAttachments, (attachment) =>
        attachment.orderBy("position", "asc").orderBy("id", "asc").limit(100),
      )
      .sub("tagLinks", relationships.thoughtTagLinks, (link) =>
        link
          .orderBy("position", "asc")
          .orderBy("id", "asc")
          .limit(200)
          .sub("tag", relationships.thoughtTagProfile, (tagProfile) => tagProfile.limit(1)),
      )
      .sub("history", relationships.thoughtHistory, (history) =>
        history.orderBy("version", "asc").orderBy("id", "asc").limit(500),
      )
      .sub("replies", relationships.thoughtReplies, (reply) =>
        reply
          .orderBy("createdAt", "asc")
          .orderBy("id", "asc")
          .limit(THOUGHT_REPLIES_LIMIT)
          .countAs("replyCount", relationships.thoughtReplies)
          .sub("attachments", relationships.thoughtAttachments, (attachment) =>
            attachment.orderBy("position", "asc").orderBy("id", "asc").limit(100),
          )
          .include(ThoughtCardFragment),
      )
      .include(ThoughtCardFragment)
      .one(),
);
