// The resolved shape of a framing's rows, shared by both arrangements. The canvas turns these into
// ReactFlow nodes and the board turns them into cards; neither owns the shape, so the two views can
// never drift on what `framingQuery` actually returns.
//
// React-free and ReactFlow-free on purpose: the board path should not pull a canvas library in.

import type { EnrichmentItemRow } from "../ItemCard.tsx";

export interface FramingAttachmentRow {
  id: string;
  storageKey: string;
  mediaType: string;
  fileName: string;
}

export interface FramingThoughtRow {
  id: string;
  body: string;
  createdAt: number;
  color: string | null;
  private: number;
  replyCount?: number;
  linkCount?: number;
  backlinkCount?: number;
  attachments?: readonly FramingAttachmentRow[];
}

export interface FramingPostRow {
  id: string;
  title: string;
  date: string | null;
  description: string;
  tags: string;
  color: string | null;
}

export interface FramingNestedRow {
  id: string;
  name: string;
  private: number;
  updatedAt: number;
}

/** The three bespoke kinds carry their own fields; every enrichment kind arrives through
 *  `EnrichmentItemRow`, resolved by the same shared fragment. */
export interface FramingNodeRow extends EnrichmentItemRow {
  id: string;
  framingId: string;
  itemType: string;
  itemId: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  position: number;
  thought?: FramingThoughtRow | readonly FramingThoughtRow[] | null;
  post?: FramingPostRow | readonly FramingPostRow[] | null;
  nestedFraming?: FramingNestedRow | readonly FramingNestedRow[] | null;
}

export interface FramingEdgeRow {
  id: string;
  framingId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
  kind: string | null;
}

export interface FramingDetail {
  id: string;
  name: string;
  description: string | null;
  private: number;
  defaultView: string;
  nodes: readonly FramingNodeRow[];
  edges: readonly FramingEdgeRow[];
}

/** A `.one()` sub-selection arrives as the row, a one-element list, or nothing at all when the
 *  reader's privacy gate withheld it. */
export function one<T>(value: T | readonly T[] | null | undefined): T | null {
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return (value ?? null) as T | null;
}
