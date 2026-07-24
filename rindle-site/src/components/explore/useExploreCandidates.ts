import { useMemo } from "react";
import { useRoot } from "@rindle/react";

import type { ExploreNodeRow } from "../../schema.local.ts";
import { currentQueryContext } from "../../rindle-client.ts";
import { thoughtEpochMs } from "../../lib/thoughts.ts";
import {
  EXPLORE_CONNECTION_LIMIT,
  EXPLORE_NEARBY_LIMIT,
  exploreClustersQuery,
  exploreCuratedConnectionsQuery,
  exploreNearbyPastesQuery,
  exploreNearbyPostsQuery,
  exploreNearbyThoughtsQuery,
  explorePasteConnectionsQuery,
  exploreThoughtConnectionsQuery,
} from "../Explore.queries.ts";
import type { ExploreCandidate, ExploreExpansionKind, ExploreItem, ExploreItemKind } from "./types.ts";

const NEARBY_RADIUS_MS = 14 * 24 * 60 * 60 * 1_000;
const EMPTY_ID = "";

interface ThoughtProjection {
  id: string;
}

interface ThoughtEdgeProjection {
  thought?: ThoughtProjection | readonly ThoughtProjection[] | null;
}

interface ThoughtConnectionsProjection {
  parent?: ThoughtProjection | readonly ThoughtProjection[] | null;
  replies?: readonly ThoughtProjection[];
  outbound?: readonly ThoughtEdgeProjection[];
  inbound?: readonly ThoughtEdgeProjection[];
}

interface PasteProjection {
  id: string;
}

interface PasteConnectionsProjection {
  parent?: PasteProjection | readonly PasteProjection[] | null;
  children?: readonly PasteProjection[];
}

interface ClusterMemberProjection {
  itemKind: string;
  itemId: string;
  distance: number;
  preview: string | null;
  projectionVersion: string;
}

interface ClusterProjection {
  label: string;
  projectionVersion: string;
  members?: readonly ClusterMemberProjection[];
}

interface ClusterMembershipProjection {
  cluster?: ClusterProjection | readonly ClusterProjection[] | null;
}

interface CuratedNodeProjection {
  itemType: string;
  itemId: string;
}

interface FramingProjection {
  name: string;
  nodes?: readonly CuratedNodeProjection[];
}

interface CuratedProjection {
  framing?: FramingProjection | readonly FramingProjection[] | null;
}

function one<T>(value: T | readonly T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) as T | null : (value ?? null) as T | null;
}

function validKind(value: string): value is ExploreItemKind {
  return value === "thought" || value === "post" || value === "paste";
}

function candidate(
  itemKind: ExploreItemKind,
  itemId: string,
  kind: string,
  options: Partial<ExploreCandidate> = {},
): ExploreCandidate {
  return {
    itemKind,
    itemId,
    kind,
    label: options.label ?? null,
    score: options.score ?? null,
    evidence: options.evidence ?? null,
    projectionVersion: options.projectionVersion ?? null,
    direction: options.direction ?? "outbound",
  };
}

function dedupe(rows: readonly ExploreCandidate[], focus: ExploreNodeRow | null, limit = 10): ExploreCandidate[] {
  const seen = new Set<string>();
  const focusKey = focus ? `${focus.itemKind}:${focus.itemId}` : "";
  return rows.filter((row) => {
    const key = `${row.itemKind}:${row.itemId}`;
    if (key === focusKey || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function timeEvidence(deltaMs: number): string {
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} minutes apart`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hours apart`;
  const days = Math.round(hours / 24);
  return `${days} days apart`;
}

export function useExploreCandidates(focusNode: ExploreNodeRow | null, focusItem: ExploreItem | null) {
  const context = currentQueryContext();
  const thoughtId = focusNode?.itemKind === "thought" ? focusNode.itemId : EMPTY_ID;
  const pasteId = focusNode?.itemKind === "paste" ? focusNode.itemId : EMPTY_ID;
  const itemArgs = {
    kind: (focusNode?.itemKind === "post" || focusNode?.itemKind === "paste" ? focusNode.itemKind : "thought") as ExploreItemKind,
    id: focusNode?.itemId ?? EMPTY_ID,
  };
  const center = focusItem?.timestamp ?? -NEARBY_RADIUS_MS * 2;
  const nearbyArgs = {
    from: center - NEARBY_RADIUS_MS,
    to: center + NEARBY_RADIUS_MS,
    limit: EXPLORE_NEARBY_LIMIT,
  };

  const [rawThoughtConnections, thoughtState] = useRoot(
    exploreThoughtConnectionsQuery,
    { id: thoughtId, limit: EXPLORE_CONNECTION_LIMIT },
    context,
  );
  const [rawPasteConnections, pasteState] = useRoot(
    explorePasteConnectionsQuery,
    { id: pasteId, limit: EXPLORE_CONNECTION_LIMIT },
    context,
  );
  const [rawClusters, clusterState] = useRoot(exploreClustersQuery, itemArgs, context);
  const [rawCurated, curatedState] = useRoot(exploreCuratedConnectionsQuery, itemArgs, context);
  const [nearbyThoughts, nearbyThoughtState] = useRoot(exploreNearbyThoughtsQuery, nearbyArgs, context);
  const [nearbyPosts, nearbyPostState] = useRoot(exploreNearbyPostsQuery, nearbyArgs);
  const [nearbyPastes, nearbyPasteState] = useRoot(exploreNearbyPastesQuery, nearbyArgs, context);

  const direct = useMemo(() => {
    const rows: ExploreCandidate[] = [];
    if (focusNode?.itemKind === "thought") {
      const connections = rawThoughtConnections as unknown as ThoughtConnectionsProjection | null;
      const parent = one(connections?.parent);
      if (parent) rows.push(candidate("thought", parent.id, "reply", { label: "parent", direction: "inbound" }));
      for (const reply of connections?.replies ?? []) {
        rows.push(candidate("thought", reply.id, "reply", { label: "reply" }));
      }
      for (const edge of connections?.outbound ?? []) {
        const target = one(edge.thought);
        if (target) rows.push(candidate("thought", target.id, "link", { label: "link" }));
      }
      for (const edge of connections?.inbound ?? []) {
        const source = one(edge.thought);
        if (source) rows.push(candidate("thought", source.id, "link", { label: "backlink", direction: "inbound" }));
      }
    }
    if (focusNode?.itemKind === "paste") {
      const connections = rawPasteConnections as unknown as PasteConnectionsProjection | null;
      const parent = one(connections?.parent);
      if (parent) rows.push(candidate("paste", parent.id, "fork", { label: "forked from", direction: "inbound" }));
      for (const child of connections?.children ?? []) {
        rows.push(candidate("paste", child.id, "fork", { label: "fork" }));
      }
    }
    return dedupe(rows, focusNode);
  }, [focusNode, rawPasteConnections, rawThoughtConnections]);

  const similar = useMemo(() => {
    const rows: ExploreCandidate[] = [];
    for (const membership of rawClusters as unknown as readonly ClusterMembershipProjection[]) {
      const cluster = one(membership.cluster);
      if (!cluster) continue;
      for (const member of cluster.members ?? []) {
        if (!validKind(member.itemKind)) continue;
        rows.push(candidate(member.itemKind, member.itemId, "similar", {
          label: cluster.label || "similar",
          score: 1 / (1 + Math.max(0, member.distance)),
          evidence: member.preview || `In the “${cluster.label}” cluster`,
          projectionVersion: member.projectionVersion || cluster.projectionVersion,
        }));
      }
    }
    return dedupe(rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), focusNode);
  }, [focusNode, rawClusters]);

  const curated = useMemo(() => {
    const rows: ExploreCandidate[] = [];
    for (const occurrence of rawCurated as unknown as readonly CuratedProjection[]) {
      const framing = one(occurrence.framing);
      if (!framing) continue;
      for (const node of framing.nodes ?? []) {
        if (!validKind(node.itemType)) continue;
        rows.push(candidate(node.itemType, node.itemId, "curated", {
          label: framing.name,
          evidence: `Curated together in “${framing.name}”`,
        }));
      }
    }
    return dedupe(rows, focusNode);
  }, [focusNode, rawCurated]);

  const temporal = useMemo(() => {
    if (!focusItem) return [];
    const rows: Array<ExploreCandidate & { delta: number }> = [];
    for (const row of nearbyThoughts) {
      const timestamp = thoughtEpochMs(row.createdAt);
      const delta = Math.abs(timestamp - focusItem.timestamp);
      rows.push({ ...candidate("thought", row.id, "temporal", {
        label: "nearby in time",
        score: 1 / (1 + delta / 3_600_000),
        evidence: timeEvidence(delta),
      }), delta });
    }
    for (const row of nearbyPosts) {
      const delta = Math.abs(row.publishedAt - focusItem.timestamp);
      rows.push({ ...candidate("post", row.id, "temporal", {
        label: "nearby in time",
        score: 1 / (1 + delta / 3_600_000),
        evidence: timeEvidence(delta),
      }), delta });
    }
    for (const row of nearbyPastes) {
      const delta = Math.abs(row.createdAt - focusItem.timestamp);
      rows.push({ ...candidate("paste", row.id, "temporal", {
        label: "nearby in time",
        score: 1 / (1 + delta / 3_600_000),
        evidence: timeEvidence(delta),
      }), delta });
    }
    return dedupe(rows.sort((a, b) => a.delta - b.delta), focusNode);
  }, [focusItem, focusNode, nearbyPastes, nearbyPosts, nearbyThoughts]);

  const mixed = useMemo(() => {
    const pools = [direct.slice(0, 4), similar.slice(0, 4), curated.slice(0, 3), temporal.slice(0, 4)];
    const rows: ExploreCandidate[] = [];
    for (let index = 0; rows.length < 10 && pools.some((pool) => index < pool.length); index++) {
      for (const pool of pools) if (pool[index]) rows.push(pool[index]);
    }
    return dedupe(rows, focusNode);
  }, [curated, direct, focusNode, similar, temporal]);

  const candidates: Record<ExploreExpansionKind, readonly ExploreCandidate[]> = {
    direct,
    similar,
    curated,
    temporal,
    mixed,
  };
  const ready: Record<ExploreExpansionKind, boolean> = {
    direct: focusNode?.itemKind === "thought"
      ? thoughtState.status === "complete"
      : focusNode?.itemKind === "paste"
        ? pasteState.status === "complete"
        : true,
    similar: clusterState.status === "complete",
    curated: curatedState.status === "complete",
    temporal: nearbyThoughtState.status === "complete" && nearbyPostState.status === "complete" && nearbyPasteState.status === "complete",
    mixed: thoughtState.status === "complete"
      && pasteState.status === "complete"
      && clusterState.status === "complete"
      && curatedState.status === "complete"
      && nearbyThoughtState.status === "complete"
      && nearbyPostState.status === "complete"
      && nearbyPasteState.status === "complete",
  };

  return { candidates, ready };
}
