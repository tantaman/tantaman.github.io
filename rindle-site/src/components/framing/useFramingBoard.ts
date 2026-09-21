// The board arrangement of a framing: the same rows the canvas draws, read as a sequence.
//
// It subscribes to the SAME named query the canvas does, so flipping views costs nothing and the two
// can never disagree about membership or privacy. Only the arrangement differs — the board reads
// `position` and never touches x/y, so a drag here leaves the drawn canvas exactly as it was.

import { useCallback, useMemo } from "react";
import { useRoot } from "@rindle/react";
import { ulid } from "ulid";

import { app, currentQueryContext } from "../../rindle-client.ts";
import { itemKey, type ItemKind } from "../../../shared/item-kinds.ts";
import { resolveEnrichmentTarget, type EnrichmentItemTarget } from "../ItemCard.tsx";
import { framingQuery } from "../Framing.queries.ts";
import {
  one,
  type FramingDetail,
  type FramingNestedRow,
  type FramingNodeRow,
  type FramingPostRow,
  type FramingThoughtRow,
} from "./rows.ts";

export type BoardTarget =
  | { kind: "thought"; thought: FramingThoughtRow }
  | { kind: "post"; post: FramingPostRow }
  | { kind: "framing"; nested: FramingNestedRow }
  | { kind: "item"; target: EnrichmentItemTarget };

export interface BoardItem {
  nodeId: string;
  itemType: string;
  itemId: string;
  position: number;
  target: BoardTarget;
}

function toBoardItem(row: FramingNodeRow): BoardItem | null {
  const base = { nodeId: row.id, itemType: row.itemType, itemId: row.itemId, position: row.position };
  if (row.itemType === "thought") {
    const thought = one(row.thought);
    return thought ? { ...base, target: { kind: "thought", thought } } : null;
  }
  if (row.itemType === "post") {
    const post = one(row.post);
    return post ? { ...base, target: { kind: "post", post } } : null;
  }
  if (row.itemType === "framing") {
    const nested = one(row.nestedFraming);
    return nested ? { ...base, target: { kind: "framing", nested } } : null;
  }
  const target = resolveEnrichmentTarget(row.itemType, row);
  return target ? { ...base, target: { kind: "item", target } } : null;
}

export function useFramingBoard(framingId: string, isAdmin: boolean) {
  const [rawDetail, { status }] = useRoot(framingQuery, framingId, currentQueryContext());
  const detail = rawDetail as unknown as FramingDetail | null;

  // The query already returns nodes ordered by (position, id), so the board renders them as they
  // arrive — no client-side sort to fall out of step with the window.
  const items = useMemo(
    () => (detail?.nodes ?? []).map(toBoardItem).filter((item): item is BoardItem => item !== null),
    [detail],
  );

  const placedItemKeys = useMemo(
    () => new Set((detail?.nodes ?? []).map((node) => itemKey(node.itemType, node.itemId))),
    [detail],
  );

  const addItem = useCallback((itemType: ItemKind, itemId: string) => {
    if (!isAdmin || (itemType === "framing" && itemId === framingId)) return;
    const last = items[items.length - 1];
    app.mutate.addFramingNode({
      node: {
        id: ulid(),
        framingId,
        itemType,
        itemId,
        // A board append still needs a canvas placement, because the same row is what the canvas
        // draws. Stack new arrivals in a column rather than piling them all on the origin.
        x: 0,
        y: items.length * 60,
        width: null,
        height: null,
        position: last ? last.position + 1 : 0,
      },
      updatedAt: Date.now(),
    });
  }, [framingId, isAdmin, items]);

  const removeItem = useCallback((nodeId: string) => {
    if (!isAdmin) return;
    app.mutate.removeFramingNode({ framingId, id: nodeId, updatedAt: Date.now() });
  }, [framingId, isAdmin]);

  /** Move `nodeId` to sit immediately before `beforeNodeId`, or to the end when it is null.
   *
   *  The happy path writes ONE row: the dragged node takes the midpoint between its new neighbours.
   *  That is only available when those neighbours hold distinct positions — and every node created
   *  before the board migration ties at 0, so the first drag on an older framing has no gap to
   *  bisect. Then, and whenever floating point leaves no representable midpoint, the whole sequence
   *  is renumbered instead. Both paths go through one mutation, so the optimistic prediction and the
   *  authority agree either way. */
  const moveItem = useCallback((nodeId: string, beforeNodeId: string | null) => {
    if (!isAdmin) return;
    const from = items.findIndex((item) => item.nodeId === nodeId);
    if (from < 0 || nodeId === beforeNodeId) return;
    const moving = items[from];

    const rest = items.filter((item) => item.nodeId !== nodeId);
    const target = beforeNodeId ? rest.findIndex((item) => item.nodeId === beforeNodeId) : rest.length;
    // Inserting at the index the item already occupies reproduces the current order, so the drop
    // landed back where it started and there is nothing to write.
    if (target < 0 || target === from) return;

    const previous = rest[target - 1];
    const next = rest[target];

    let position: number | null = null;
    if (previous && next) {
      const midpoint = (previous.position + next.position) / 2;
      if (midpoint > previous.position && midpoint < next.position) position = midpoint;
    } else if (next) {
      position = next.position - 1;
    } else if (previous) {
      position = previous.position + 1;
    } else {
      position = 0;
    }

    if (position !== null) {
      app.mutate.reorderFramingNodes({
        framingId,
        nodes: [{ id: nodeId, position }],
        updatedAt: Date.now(),
      });
      return;
    }

    const ordered = [...rest.slice(0, target), moving, ...rest.slice(target)];
    app.mutate.reorderFramingNodes({
      framingId,
      nodes: ordered.map((item, index) => ({ id: item.nodeId, position: index })),
      updatedAt: Date.now(),
    });
  }, [framingId, isAdmin, items]);

  return {
    framing: detail,
    items,
    placedItemKeys,
    addItem,
    removeItem,
    moveItem,
    loading: !detail && status !== "complete",
    missing: !detail && status === "complete",
  };
}
