import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoot } from "@rindle/react";
import {
  MarkerType,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { ulid } from "ulid";

import { app } from "../../rindle-client.ts";
import { parseList } from "../../lib/format.ts";
import {
  hashThoughtBody,
  thoughtEnrichmentArgs,
  thoughtTagArgs,
} from "../../lib/thoughts.ts";
import {
  FRAMING_CONNECTION_LIMIT,
  framingAdminQuery,
  framingAdminThoughtConnectionsQuery,
  framingQuery,
  framingThoughtConnectionsQuery,
} from "../Framing.queries.ts";
import type {
  ComposeNodeData,
  FramingFlowNode,
  NestedFramingNodeData,
  PostNodeData,
  ThoughtNodeData,
} from "./FramingNodes.tsx";
import type { FramingEdgeData, FramingFlowEdge } from "./FramingEdge.tsx";

const COMPOSE_NODE_ID = "__compose__";
const NODE_WIDTH = 250;
const NODE_HEIGHT = 150;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 80;

interface CanvasThought {
  id: string;
  body: string;
  createdAt: number;
  color: string | null;
  private: number;
  replyCount?: number;
}

interface CanvasPost {
  id: string;
  title: string;
  date: string | null;
  description: string;
  tags: string;
  color: string | null;
}

interface CanvasNestedFraming {
  id: string;
  name: string;
  updatedAt: number;
}

interface CanvasNodeRow {
  id: string;
  framingId: string;
  itemType: string;
  itemId: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  thought?: CanvasThought | readonly CanvasThought[] | null;
  post?: CanvasPost | readonly CanvasPost[] | null;
  nestedFraming?: CanvasNestedFraming | readonly CanvasNestedFraming[] | null;
}

interface CanvasEdgeRow {
  id: string;
  framingId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
  kind: string | null;
}

interface CanvasDetail {
  id: string;
  name: string;
  description: string | null;
  nodes: readonly CanvasNodeRow[];
  edges: readonly CanvasEdgeRow[];
}

interface RelatedEdge {
  thought?: CanvasThought | readonly CanvasThought[] | null;
}

interface ConnectionDetail {
  id: string;
  replies: readonly CanvasThought[];
  outbound: readonly RelatedEdge[];
  inbound: readonly RelatedEdge[];
}

type ExpansionKind = "replies" | "links" | "backlinks";
interface ExpansionRequest {
  kind: ExpansionKind;
  parentNodeId: string;
  thoughtId: string;
}

function one<T>(value: T | readonly T[] | null | undefined): T | null {
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return (value ?? null) as T | null;
}

const EDGE_COLORS: Record<string, string> = {
  reply: "#7aa2f7",
  link: "#76a85d",
};

function toFlowEdge(
  row: CanvasEdgeRow,
  editable: boolean,
  onLabelChange: (edgeId: string, label: string | null) => void,
): FramingFlowEdge {
  const color = row.kind ? EDGE_COLORS[row.kind] : undefined;
  return {
    id: `edge:${row.id}`,
    source: row.sourceNodeId,
    target: row.targetNodeId,
    sourceHandle: row.sourceHandle ?? undefined,
    targetHandle: row.targetHandle ?? undefined,
    type: "labeled",
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: color ? { stroke: color } : undefined,
    data: {
      label: row.label,
      edgeId: row.id,
      kind: row.kind,
      editable,
      onLabelChange,
    },
  };
}

export function useFramingCanvas(framingId: string, isAdmin: boolean) {
  const detailQuery = isAdmin ? framingAdminQuery : framingQuery;
  const connectionQuery = isAdmin ? framingAdminThoughtConnectionsQuery : framingThoughtConnectionsQuery;
  const [rawDetail, { status }] = useRoot(detailQuery, framingId);
  const detail = rawDetail as unknown as CanvasDetail | null;
  const [expansion, setExpansion] = useState<ExpansionRequest | null>(null);
  const [rawConnections, { status: connectionStatus }] = useRoot(connectionQuery, {
    id: expansion?.thoughtId ?? "",
    limit: FRAMING_CONNECTION_LIMIT,
  });
  const connections = rawConnections as unknown as ConnectionDetail | null;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [composePosition, setComposePosition] = useState<{ x: number; y: number } | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const pendingPositions = useRef(new Map<string, { id: string; x: number; y: number }>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushPositions = useCallback(() => {
    if (!isAdmin || pendingPositions.current.size === 0) return;
    const moved = [...pendingPositions.current.values()];
    pendingPositions.current.clear();
    app.mutate.updateFramingNodes({ framingId, nodes: moved, updatedAt: Date.now() });
  }, [framingId, isAdmin]);

  useEffect(() => () => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushPositions();
  }, [flushPositions]);

  const removeNode = useCallback((nodeId: string) => {
    if (!isAdmin) return;
    app.mutate.removeFramingNode({ framingId, id: nodeId, updatedAt: Date.now() });
  }, [framingId, isAdmin]);

  const updateEdgeLabel = useCallback((edgeId: string, label: string | null) => {
    if (!isAdmin) return;
    app.mutate.updateFramingEdge({ framingId, id: edgeId, label, updatedAt: Date.now() });
  }, [framingId, isAdmin]);

  const requestExpansion = useCallback((kind: ExpansionKind, parentNodeId: string) => {
    if (!isAdmin) return;
    const parent = nodesRef.current.find((node) => node.id === parentNodeId);
    if (parent?.type !== "thought") return;
    const data = parent.data as ThoughtNodeData;
    setExpansion({ kind, parentNodeId, thoughtId: data.thoughtId });
  }, [isAdmin]);

  const expandReplies = useCallback((nodeId: string) => requestExpansion("replies", nodeId), [requestExpansion]);
  const expandLinks = useCallback((nodeId: string) => requestExpansion("links", nodeId), [requestExpansion]);
  const expandBacklinks = useCallback((nodeId: string) => requestExpansion("backlinks", nodeId), [requestExpansion]);

  const toFlowNode = useCallback((row: CanvasNodeRow): FramingFlowNode | null => {
    if (row.itemType === "thought") {
      const thought = one(row.thought);
      if (!thought) return null;
      return {
        id: row.id,
        type: "thought",
        position: { x: row.x, y: row.y },
        data: {
          nodeId: row.id,
          thoughtId: thought.id,
          body: thought.body,
          createdAt: thought.createdAt,
          color: thought.color,
          replyCount: thought.replyCount ?? 0,
          linkCount: (thought as CanvasThought & { linkCount?: number }).linkCount ?? 0,
          backlinkCount: (thought as CanvasThought & { backlinkCount?: number }).backlinkCount ?? 0,
          editable: isAdmin,
          onRemove: removeNode,
          onExpandReplies: expandReplies,
          onExpandLinks: expandLinks,
          onExpandBacklinks: expandBacklinks,
        },
      };
    }
    if (row.itemType === "post") {
      const post = one(row.post);
      if (!post) return null;
      return {
        id: row.id,
        type: "post",
        position: { x: row.x, y: row.y },
        data: {
          nodeId: row.id,
          slug: post.id,
          title: post.title,
          description: post.description,
          date: post.date,
          tags: parseList(post.tags),
          color: post.color,
          editable: isAdmin,
          onRemove: removeNode,
        },
      };
    }
    if (row.itemType === "framing") {
      const nested = one(row.nestedFraming);
      if (!nested) return null;
      return {
        id: row.id,
        type: "framing",
        position: { x: row.x, y: row.y },
        data: {
          nodeId: row.id,
          framingId: nested.id,
          title: nested.name,
          editable: isAdmin,
          onRemove: removeNode,
        },
      };
    }
    return null;
  }, [expandBacklinks, expandLinks, expandReplies, isAdmin, removeNode]);

  useEffect(() => {
    if (!detail) {
      if (status === "complete") { setNodes([]); setEdges([]); }
      return;
    }
    setNodes(detail.nodes.map(toFlowNode).filter((node): node is FramingFlowNode => node !== null));
    setEdges(detail.edges.map((edge) => toFlowEdge(edge, isAdmin, updateEdgeLabel)));
  }, [detail, isAdmin, status, toFlowNode, updateEdgeLabel]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
    for (const change of changes) {
      if (change.type !== "position" || !change.position || change.id === COMPOSE_NODE_ID) continue;
      pendingPositions.current.set(change.id, {
        id: change.id,
        x: change.position.x,
        y: change.position.y,
      });
    }
  }, []);

  const onNodeDragStop = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushPositions, 350);
  }, [flushPositions]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (!isAdmin || !connection.source || !connection.target) return;
    app.mutate.createFramingEdge({
      edge: {
        id: ulid(),
        framingId,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        label: null,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        kind: null,
      },
      updatedAt: Date.now(),
    });
  }, [framingId, isAdmin]);

  const addNode = useCallback((itemType: "thought" | "post" | "framing", itemId: string, x: number, y: number) => {
    if (!isAdmin || (itemType === "framing" && itemId === framingId)) return;
    app.mutate.addFramingNode({
      node: {
        id: ulid(),
        framingId,
        itemType,
        itemId,
        x,
        y,
        width: null,
        height: null,
      },
      updatedAt: Date.now(),
    });
  }, [framingId, isAdmin]);

  useEffect(() => {
    if (!expansion || connectionStatus !== "complete" || connections?.id !== expansion.thoughtId) return;
    const parent = nodesRef.current.find((node) => node.id === expansion.parentNodeId);
    if (!parent) { setExpansion(null); return; }

    let items: CanvasThought[] = [];
    if (expansion.kind === "replies") {
      items = [...connections.replies];
    } else {
      const relatedEdges = expansion.kind === "links" ? connections.outbound : connections.inbound;
      items = relatedEdges.flatMap((edge) => {
        const thought = one(edge.thought);
        return thought ? [thought] : [];
      });
    }

    const placed = new Map<string, string>();
    for (const node of nodesRef.current) {
      if (node.type === "thought") placed.set((node.data as ThoughtNodeData).thoughtId, node.id);
    }
    const newItems = items.filter((item) => !placed.has(item.id));
    const existingEdges = new Set(edgesRef.current.map((edge) => `${edge.source}->${edge.target}`));
    let newIndex = 0;

    for (const item of items) {
      if (item.id === expansion.thoughtId) continue;
      let nodeId = placed.get(item.id);
      if (!nodeId) {
        const count = newItems.length;
        const index = newIndex++;
        let x: number;
        let y: number;
        if (expansion.kind === "replies") {
          const totalWidth = count * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
          x = parent.position.x + NODE_WIDTH / 2 - totalWidth / 2 + index * (NODE_WIDTH + HORIZONTAL_GAP);
          y = parent.position.y + NODE_HEIGHT + VERTICAL_GAP;
        } else {
          const totalHeight = count * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;
          x = expansion.kind === "links"
            ? parent.position.x + NODE_WIDTH + HORIZONTAL_GAP
            : parent.position.x - NODE_WIDTH - HORIZONTAL_GAP;
          y = parent.position.y + NODE_HEIGHT / 2 - totalHeight / 2 + index * (NODE_HEIGHT + VERTICAL_GAP);
        }
        nodeId = ulid();
        placed.set(item.id, nodeId);
        app.mutate.addFramingNode({
          node: { id: nodeId, framingId, itemType: "thought", itemId: item.id, x, y, width: null, height: null },
          updatedAt: Date.now(),
        });
      }

      const fromParent = expansion.kind !== "backlinks";
      const sourceNodeId = fromParent ? expansion.parentNodeId : nodeId;
      const targetNodeId = fromParent ? nodeId : expansion.parentNodeId;
      const edgeKey = `${sourceNodeId}->${targetNodeId}`;
      if (existingEdges.has(edgeKey)) continue;
      existingEdges.add(edgeKey);
      app.mutate.createFramingEdge({
        edge: {
          id: ulid(),
          framingId,
          sourceNodeId,
          targetNodeId,
          label: null,
          sourceHandle: expansion.kind === "replies" ? "bottom-source" : "right-source",
          targetHandle: expansion.kind === "replies" ? "top-target" : "left-target",
          kind: expansion.kind === "replies" ? "reply" : "link",
        },
        updatedAt: Date.now(),
      });
    }
    setExpansion(null);
  }, [connectionStatus, connections, expansion, framingId]);

  const deleteEdge = useCallback((flowEdgeId: string) => {
    if (!isAdmin) return;
    const edge = edgesRef.current.find((candidate) => candidate.id === flowEdgeId);
    const edgeId = (edge?.data as FramingEdgeData | undefined)?.edgeId;
    if (!edgeId) return;
    app.mutate.deleteFramingEdge({ framingId, id: edgeId, updatedAt: Date.now() });
  }, [framingId, isAdmin]);

  const startCompose = useCallback((x: number, y: number) => {
    if (isAdmin) setComposePosition({ x, y });
  }, [isAdmin]);

  const submitCompose = useCallback(async (body: string, isPrivate: boolean) => {
    const now = Date.now();
    const thoughtId = ulid();
    const revision = ulid();
    const bodyHash = await hashThoughtBody(body);
    app.mutate.createThought({
      thought: {
        id: thoughtId,
        body,
        bodyHash,
        createdAt: now,
        updatedAt: now,
        parentId: null,
        private: isPrivate ? 1 : 0,
        contentRevision: revision,
      },
      tags: thoughtTagArgs(body),
      attachments: [],
      edges: [],
      enrichments: thoughtEnrichmentArgs(body, now, revision),
    });
    if (composePosition) addNode("thought", thoughtId, composePosition.x, composePosition.y);
    setComposePosition(null);
  }, [addNode, composePosition]);

  const renderedNodes = useMemo(() => {
    if (!composePosition) return nodes;
    const composeNode: Node<ComposeNodeData, "compose"> = {
      id: COMPOSE_NODE_ID,
      type: "compose",
      position: composePosition,
      data: { onSubmit: submitCompose, onCancel: () => setComposePosition(null) },
      draggable: false,
    };
    return [...nodes, composeNode];
  }, [composePosition, nodes, submitCompose]);

  const applyLayout = useCallback((positions: Map<string, { x: number; y: number }>) => {
    if (!isAdmin || positions.size === 0) return;
    setNodes((current) => current.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, position } : node;
    }));
    app.mutate.updateFramingNodes({
      framingId,
      updatedAt: Date.now(),
      nodes: [...positions].map(([id, position]) => ({ id, ...position })),
    });
  }, [framingId, isAdmin]);

  const placedItemKeys = useMemo(() => new Set((detail?.nodes ?? []).map((node) => `${node.itemType}:${node.itemId}`)), [detail]);

  return {
    nodes: renderedNodes,
    edges,
    onNodesChange,
    onNodeDragStop,
    onEdgesChange,
    onConnect,
    addNode,
    deleteEdge,
    startCompose,
    applyLayout,
    placedItemKeys,
    framing: detail,
    loading: !detail && status !== "complete",
    missing: !detail && status === "complete",
  };
}
