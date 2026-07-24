// Browser-authoritative Explore state. These tables deliberately live outside the generated
// server schema: they never cross the wire, never participate in optimistic rebase, and can join
// the synced corpus through ad-hoc local queries. `local: true` rows are durable when the client
// enables `persistLocal`; the view row remains per-tab and ephemeral.

import { extendSchema, number, string, table } from "@rindle/client";
import type { Row } from "@rindle/client";

import { schema as generatedSchema } from "../shared/schema.gen.ts";

export const exploreSession = table("exploreSession", { local: true })
  .columns({
    id: string(),
    title: string(),
    seedKind: string().nullable(),
    seedItemId: string().nullable(),
    seedQuery: string().nullable(),
    createdAt: number(),
    updatedAt: number(),
  })
  .primaryKey("id");

export const exploreNode = table("exploreNode", { local: true })
  .columns({
    id: string(),
    sessionId: string(),
    itemKind: string(),
    itemId: string(),
    x: number(),
    y: number(),
    pinned: number(),
    parentNodeId: string().nullable(),
    discoveredBy: string(),
    addedAt: number(),
  })
  .primaryKey("id");

export const exploreEdge = table("exploreEdge", { local: true })
  .columns({
    id: string(),
    sessionId: string(),
    sourceNodeId: string(),
    targetNodeId: string(),
    kind: string(),
    label: string().nullable(),
    score: number().nullable(),
    evidence: string().nullable(),
    projectionVersion: string().nullable(),
    accepted: number(),
    addedAt: number(),
  })
  .primaryKey("id");

export const exploreView = table("exploreView", { local: "session" })
  .columns({
    id: string(),
    focusedNodeId: string().nullable(),
    selectedNodeId: string().nullable(),
    viewportX: number(),
    viewportY: number(),
    zoom: number(),
  })
  .primaryKey("id");

export const clientSchema = extendSchema(generatedSchema, {
  tables: [exploreSession, exploreNode, exploreEdge, exploreView],
});

export type ExploreSessionRow = Row<typeof exploreSession>;
export type ExploreNodeRow = Row<typeof exploreNode>;
export type ExploreEdgeRow = Row<typeof exploreEdge>;
export type ExploreViewRow = Row<typeof exploreView>;
