// Named, bounded server views used to hydrate a local-only Explore graph and fan out from its
// focused node. The graph topology itself stays browser-authoritative; these queries keep the
// referenced content and candidate neighborhoods current without subscribing to whole tables.

import { and, defineQuery, ge, inList, le, notExists, or } from "@rindle/client";
import type { QueryLocalData } from "@rindle/client";
import { z } from "zod";

import { q, relationships, thought } from "../../shared/app-def.ts";
import { canPublish, type QueryContext } from "../../shared/auth.ts";

export const EXPLORE_MAX_NODES = 200;
export const EXPLORE_NEARBY_LIMIT = 36;
export const EXPLORE_CONNECTION_LIMIT = 40;
export const EXPLORE_CLUSTER_LIMIT = 4;
export const EXPLORE_CLUSTER_MEMBER_LIMIT = 16;
export const EXPLORE_CURATED_LIMIT = 8;
export const EXPLORE_CURATED_NODE_LIMIT = 32;

const EMPTY_ID = "\u0000explore";
const itemKind = z.enum(["thought", "post", "paste"]);
const idsArgs = z.object({
  ids: z.array(z.string().min(1).max(500)).max(EXPLORE_MAX_NODES),
});
const connectionArgs = z.object({
  id: z.string().max(500),
  limit: z.number().int().min(1).max(EXPLORE_CONNECTION_LIMIT),
});
const neighborhoodArgs = z.object({
  from: z.number().finite(),
  to: z.number().finite(),
  limit: z.number().int().min(1).max(EXPLORE_NEARBY_LIMIT),
});
const itemArgs = z.object({
  kind: itemKind,
  id: z.string().max(500),
});

function boundedIds(ids: readonly string[]): string[] {
  return ids.length > 0 ? [...ids] : [EMPTY_ID];
}

export const exploreThoughtsByIdsQuery = defineQuery(
  "exploreThoughtsByIds",
  (raw) => idsArgs.parse(raw),
  ({ ids }, ctx: QueryContext) => {
    let root = q.thought.where.id(inList(boundedIds(ids)));
    if (!canPublish(ctx.user)) root = root.where.private(0);
    return root
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(EXPLORE_MAX_NODES)
      .countAs("replyCount", relationships.thoughtReplies, (reply) => canPublish(ctx.user) ? reply : reply.where.private(0))
      .countAs("linkCount", relationships.thoughtOutboundEdges, (edge) => edge.where.kind("link"))
      .countAs("backlinkCount", relationships.thoughtInboundEdges, (edge) => edge.where.kind("link"))
      .select("id", "body", "createdAt", "updatedAt", "color", "private");
  },
);

export const explorePostsByIdsQuery = defineQuery(
  "explorePostsByIds",
  (raw) => idsArgs.parse(raw),
  ({ ids }) => q.post
    .where.id(inList(boundedIds(ids)))
    .orderBy("publishedAt", "desc")
    .orderBy("id", "asc")
    .limit(EXPLORE_MAX_NODES)
    .select("id", "title", "date", "publishedAt", "description", "tags", "color"),
);

export const explorePastesByIdsQuery = defineQuery(
  "explorePastesByIds",
  (raw) => idsArgs.parse(raw),
  ({ ids }, ctx: QueryContext) => {
    let root = q.paste.where.id(inList(boundedIds(ids)));
    if (!canPublish(ctx.user)) root = root.where.shared(1);
    return root
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(EXPLORE_MAX_NODES)
      .countAs("forkCount", relationships.pasteChildren)
      .select("id", "title", "excerpt", "language", "createdAt", "sharedAt", "parentId");
  },
);

export const exploreThoughtConnectionsQuery = defineQuery(
  "exploreThoughtConnections",
  (raw) => connectionArgs.parse(raw),
  ({ id, limit }, ctx: QueryContext) => {
    const admin = canPublish(ctx.user);
    let root = q.thought.where.id(id || EMPTY_ID);
    if (!admin) root = root.where.private(0);
    return root
      .sub("parent", relationships.thoughtParent, (parent) => {
        const visible = admin ? parent : parent.where.private(0);
        return visible.select("id", "body", "createdAt", "color", "private").one();
      })
      .sub("replies", relationships.thoughtReplies, (reply) => {
        const visible = admin ? reply : reply.where.private(0);
        return visible
          .orderBy("createdAt", "asc")
          .orderBy("id", "asc")
          .limit(limit)
          .select("id", "body", "createdAt", "color", "private");
      })
      .sub("outbound", relationships.thoughtOutboundEdges, (edge) => edge
        .where.kind("link")
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(limit)
        .sub("thought", relationships.thoughtEdgeTarget, (target) => {
          const visible = admin ? target : target.where.private(0);
          return visible.select("id", "body", "createdAt", "color", "private").one();
        }))
      .sub("inbound", relationships.thoughtInboundEdges, (edge) => edge
        .where.kind("link")
        .orderBy("createdAt", "asc")
        .orderBy("id", "asc")
        .limit(limit)
        .sub("thought", relationships.thoughtEdgeSource, (source) => {
          const visible = admin ? source : source.where.private(0);
          return visible.select("id", "body", "createdAt", "color", "private").one();
        }))
      .select("id")
      .one();
  },
);

export const explorePasteConnectionsQuery = defineQuery(
  "explorePasteConnections",
  (raw) => connectionArgs.parse(raw),
  ({ id, limit }, ctx: QueryContext) => {
    const admin = canPublish(ctx.user);
    let root = q.paste.where.id(id || EMPTY_ID);
    if (!admin) root = root.where.shared(1);
    return root
      .sub("parent", relationships.pasteParent, (parent) => {
        const visible = admin ? parent : parent.where.shared(1);
        return visible.select("id", "title", "excerpt", "language", "createdAt", "sharedAt", "parentId").one();
      })
      .sub("children", relationships.pasteChildren, (child) => {
        const visible = admin ? child : child.where.shared(1);
        return visible
          .orderBy("createdAt", "asc")
          .orderBy("id", "asc")
          .limit(limit)
          .select("id", "title", "excerpt", "language", "createdAt", "sharedAt", "parentId");
      })
      .select("id")
      .one();
  },
);

export const exploreNearbyThoughtsQuery = defineQuery(
  "exploreNearbyThoughts",
  (raw) => neighborhoodArgs.parse(raw),
  ({ from, to, limit }, ctx: QueryContext) => {
    // Imported thoughts may carry epoch seconds while current writes use milliseconds. Search both
    // representations so a temporal fan can bridge old and new captures.
    let root = q.thought.where(or(
      and(thought.createdAt(ge(from)), thought.createdAt(le(to))),
      and(thought.createdAt(ge(from / 1_000)), thought.createdAt(le(to / 1_000))),
    ));
    if (!canPublish(ctx.user)) root = root.where.private(0);
    return root
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(limit)
      .select("id", "body", "createdAt", "color", "private");
  },
);

export const exploreNearbyPostsQuery = defineQuery(
  "exploreNearbyPosts",
  (raw) => neighborhoodArgs.parse(raw),
  ({ from, to, limit }) => q.post
    .where.publishedAt(ge(from))
    .where.publishedAt(le(to))
    .orderBy("publishedAt", "desc")
    .orderBy("id", "asc")
    .limit(limit)
    .select("id", "title", "date", "publishedAt", "description", "tags", "color"),
);

export const exploreNearbyPastesQuery = defineQuery(
  "exploreNearbyPastes",
  (raw) => neighborhoodArgs.parse(raw),
  ({ from, to, limit }, ctx: QueryContext) => {
    let root = q.paste
      .where(notExists(relationships.pasteChildren))
      .where.createdAt(ge(from))
      .where.createdAt(le(to));
    if (!canPublish(ctx.user)) root = root.where.shared(1);
    return root
      .orderBy("createdAt", "desc")
      .orderBy("id", "asc")
      .limit(limit)
      .select("id", "title", "excerpt", "language", "createdAt", "sharedAt", "parentId");
  },
);

export const exploreClustersQuery = defineQuery(
  "exploreClusters",
  (raw) => itemArgs.parse(raw),
  ({ kind, id }, ctx: QueryContext) => {
    let root = q.clusterMembership.where.itemKind(kind).where.itemId(id || EMPTY_ID);
    // Cluster projections can span private and public content. Until visibility is materialized on
    // membership rows, expose this discovery path only to the publishing principal.
    if (!canPublish(ctx.user)) root = root.where.id(EMPTY_ID);
    return root
      .orderBy("rank", "asc")
      .orderBy("id", "asc")
      .limit(EXPLORE_CLUSTER_LIMIT)
      .sub("cluster", relationships.clusterMembershipCluster, (cluster) => cluster
        .sub("members", relationships.clusterMembers, (member) => member
          .orderBy("distance", "asc")
          .orderBy("id", "asc")
          .limit(EXPLORE_CLUSTER_MEMBER_LIMIT)
          .select("id", "itemKind", "itemId", "rank", "distance", "title", "preview", "projectionVersion"))
        .select("id", "label", "projectionVersion")
        .one())
      .select("id", "clusterId", "rank", "distance", "projectionVersion");
  },
);

export const exploreCuratedConnectionsQuery = defineQuery(
  "exploreCuratedConnections",
  (raw) => itemArgs.parse(raw),
  ({ kind, id }, ctx: QueryContext) => {
    let root = q.framingNode.where.itemType(kind).where.itemId(id || EMPTY_ID);
    // A framing can contain private nodes. Keep its polymorphic ids out of anonymous discovery.
    if (!canPublish(ctx.user)) root = root.where.id(EMPTY_ID);
    return root
      .orderBy("id", "asc")
      .limit(EXPLORE_CURATED_LIMIT)
      .sub("framing", relationships.framingNodeParentFraming, (framing) => framing
        .sub("nodes", relationships.framingNodes, (node) => node
          .orderBy("id", "asc")
          .limit(EXPLORE_CURATED_NODE_LIMIT)
          .select("id", "itemType", "itemId"))
        .select("id", "name")
        .one())
      .select("id", "framingId", "itemType", "itemId");
  },
);

export type ExploreThoughtRow = QueryLocalData<ReturnType<typeof exploreThoughtsByIdsQuery>>[number];
export type ExplorePostRow = QueryLocalData<ReturnType<typeof explorePostsByIdsQuery>>[number];
export type ExplorePasteRow = QueryLocalData<ReturnType<typeof explorePastesByIdsQuery>>[number];
export type ExploreThoughtConnections = QueryLocalData<ReturnType<typeof exploreThoughtConnectionsQuery>>;
export type ExplorePasteConnections = QueryLocalData<ReturnType<typeof explorePasteConnectionsQuery>>;
export type ExploreClusterRow = QueryLocalData<ReturnType<typeof exploreClustersQuery>>[number];
export type ExploreCuratedRow = QueryLocalData<ReturnType<typeof exploreCuratedConnectionsQuery>>[number];
