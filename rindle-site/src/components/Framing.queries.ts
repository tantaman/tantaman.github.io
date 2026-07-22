// Named Rindle views for the framing list, canvas, picker, and on-demand thought expansion. The
// module stays React-free because the browser, API authority, and SSR loaders all import it.

import { defineQuery, ilike } from "@rindle/client";
import type { QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { q, relationships } from "../../shared/app-def.ts";

export const FRAMINGS_LIMIT = 500;
export const FRAMING_NODE_LIMIT = 1_000;
export const FRAMING_EDGE_LIMIT = 5_000;
export const FRAMING_PICKER_PAGE_SIZE = 100;
export const FRAMING_PICKER_MAX_LIMIT = 1_000;
export const FRAMING_CONNECTION_LIMIT = 200;

const framingListArgs = z.object({
  limit: z.number().int().min(1).max(FRAMINGS_LIMIT),
});
const framingIdArgs = z.string().min(1).max(500);
const pickerArgs = z.object({
  search: z.string().max(200),
  limit: z.number().int().min(1).max(FRAMING_PICKER_MAX_LIMIT),
});
const connectionArgs = z.object({
  id: z.string().max(500),
  limit: z.number().int().min(1).max(FRAMING_CONNECTION_LIMIT),
});

export const framingsQuery = defineQuery("framings", (raw) => framingListArgs.parse(raw), ({ limit }) =>
  q.framing
    .orderBy("updatedAt", "desc")
    .orderBy("id", "asc")
    .limit(limit + 1)
    .select("id", "authorId", "name", "description", "createdAt", "updatedAt"),
);

function framingDetail(id: string, admin: boolean) {
  return q.framing
    .where.id(id)
    .sub("nodes", relationships.framingNodes, (node) =>
      node
        .orderBy("id", "asc")
        .limit(FRAMING_NODE_LIMIT)
        .sub("thought", relationships.framingNodeThought, (thought) => {
          const visible = admin ? thought : thought.where.private(0);
          return visible
            .countAs("replyCount", relationships.thoughtReplies, (reply) => admin ? reply : reply.where.private(0))
            .countAs("linkCount", relationships.thoughtOutboundEdges, (edge) => edge.where.kind("link"))
            .countAs("backlinkCount", relationships.thoughtInboundEdges, (edge) => edge.where.kind("link"))
            .select("id", "body", "createdAt", "color", "private")
            .one();
        })
        .sub("post", relationships.framingNodePost, (post) =>
          post
            .select("id", "title", "date", "description", "tags", "color")
            .one(),
        )
        .sub("nestedFraming", relationships.framingNodeFraming, (nested) =>
          nested.select("id", "name", "updatedAt").one(),
        ),
    )
    .sub("edges", relationships.framingEdges, (edge) =>
      edge.orderBy("id", "asc").limit(FRAMING_EDGE_LIMIT),
    )
    .one();
}

export const framingQuery = defineQuery("framing", (raw) => framingIdArgs.parse(raw), (id) =>
  framingDetail(id, false),
);

export const framingAdminQuery = defineQuery("framingAdmin", (raw) => framingIdArgs.parse(raw), (id) =>
  framingDetail(id, true),
);

function thoughtPicker(args: z.infer<typeof pickerArgs>, admin: boolean) {
  let thought = q.thought;
  if (!admin) thought = thought.where.private(0);
  if (args.search.trim()) thought = thought.where.body(ilike(`%${args.search.trim()}%`));
  return thought
    .orderBy("createdAt", "desc")
    .orderBy("id", "asc")
    .limit(args.limit + 1)
    .select("id", "body", "createdAt", "color", "private");
}

export const framingThoughtsQuery = defineQuery(
  "framingThoughts",
  (raw) => pickerArgs.parse(raw),
  (args) => thoughtPicker(args, false),
);

export const framingAdminThoughtsQuery = defineQuery(
  "framingAdminThoughts",
  (raw) => pickerArgs.parse(raw),
  (args) => thoughtPicker(args, true),
);

export const framingPostsQuery = defineQuery("framingPosts", (raw) => pickerArgs.parse(raw), (args) => {
  let post = q.post;
  if (args.search.trim()) post = post.where.title(ilike(`%${args.search.trim()}%`));
  return post
    .orderBy("publishedAt", "desc")
    .orderBy("id", "asc")
    .limit(args.limit + 1)
    .select("id", "title", "date", "description", "tags", "color");
});

function thoughtConnections(args: z.infer<typeof connectionArgs>, admin: boolean) {
  let root = q.thought.where.id(args.id);
  if (!admin) root = root.where.private(0);
  return root
    .sub("replies", relationships.thoughtReplies, (reply) => {
      const visible = admin ? reply : reply.where.private(0);
      return visible
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(args.limit)
        .countAs("replyCount", relationships.thoughtReplies, (nested) => admin ? nested : nested.where.private(0))
        .select("id", "body", "createdAt", "color", "private");
    })
    .sub("outbound", relationships.thoughtOutboundEdges, (edge) =>
      edge
        .where.kind("link")
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(args.limit)
        .sub("thought", relationships.thoughtEdgeTarget, (target) => {
          const visible = admin ? target : target.where.private(0);
          return visible
            .countAs("replyCount", relationships.thoughtReplies, (reply) => admin ? reply : reply.where.private(0))
            .select("id", "body", "createdAt", "color", "private")
            .one();
        }),
    )
    .sub("inbound", relationships.thoughtInboundEdges, (edge) =>
      edge
        .where.kind("link")
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(args.limit)
        .sub("thought", relationships.thoughtEdgeSource, (source) => {
          const visible = admin ? source : source.where.private(0);
          return visible
            .countAs("replyCount", relationships.thoughtReplies, (reply) => admin ? reply : reply.where.private(0))
            .select("id", "body", "createdAt", "color", "private")
            .one();
        }),
    )
    .select("id")
    .one();
}

export const framingThoughtConnectionsQuery = defineQuery(
  "framingThoughtConnections",
  (raw) => connectionArgs.parse(raw),
  (args) => thoughtConnections(args, false),
);

export const framingAdminThoughtConnectionsQuery = defineQuery(
  "framingAdminThoughtConnections",
  (raw) => connectionArgs.parse(raw),
  (args) => thoughtConnections(args, true),
);

export type FramingsRow = QueryLocalData<ReturnType<typeof framingsQuery>>[number];
export type FramingDetailRow = NonNullable<QueryLocalData<ReturnType<typeof framingQuery>>>;
export type FramingAdminDetailRow = NonNullable<QueryLocalData<ReturnType<typeof framingAdminQuery>>>;
export type FramingThoughtPickerRow = QueryLocalData<ReturnType<typeof framingThoughtsQuery>>[number];
export type FramingAdminThoughtPickerRow = QueryLocalData<ReturnType<typeof framingAdminThoughtsQuery>>[number];
export type FramingPostPickerRow = QueryLocalData<ReturnType<typeof framingPostsQuery>>[number];
export type FramingThoughtConnectionsRow = NonNullable<QueryLocalData<ReturnType<typeof framingThoughtConnectionsQuery>>>;
export type FramingAdminThoughtConnectionsRow = NonNullable<QueryLocalData<ReturnType<typeof framingAdminThoughtConnectionsQuery>>>;
