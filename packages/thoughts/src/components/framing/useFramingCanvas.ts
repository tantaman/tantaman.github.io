import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import { useFraming, usePostsManifest } from '../../hooks/useCache';
import { AuthContext } from '../../App';
import {
  addNodeToFraming,
  removeNodeFromFraming,
  batchUpdateNodes,
  createFramingEdge,
  updateFramingEdge,
  deleteFramingEdge,
  postThought,
  getThread,
  getRelated,
} from '../../api';
import type { RelatedItem } from '../../types';
import type { ThoughtNodeData } from './ThoughtNode';
import type { PostNodeData } from './PostNode';
import type { DocumentNodeData } from './DocumentNode';
import type { FramingNodeData } from './FramingNode';
import type { LabeledEdgeData } from './LabeledEdge';
import type { FramingNode, FramingEdge as FramingEdgeType, PostSummary } from '../../types';

const COMPOSE_NODE_ID = '__compose__';

// Layout constants for reply expansion (mirrors the values in FramingCanvasView)
const NODE_W = 250;
const NODE_H = 150;
const HGAP = 60;
const VGAP = 80;

type ThoughtCallbacks = {
  onRemove: (nodeId: number) => void;
  onExpandReplies: (nodeId: number) => void | Promise<void>;
  onExpandLinks: (nodeId: number) => void | Promise<void>;
  onExpandBacklinks: (nodeId: number) => void | Promise<void>;
};

function framingNodeToRFNode(
  n: FramingNode,
  thoughtCbs: ThoughtCallbacks,
  postsMap: Map<string, PostSummary>,
): Node<ThoughtNodeData | PostNodeData | DocumentNodeData | FramingNodeData> | null {
  if (n.node_type === 'thought') {
    return {
      id: String(n.id),
      type: 'thought',
      position: { x: n.x, y: n.y },
      data: {
        body: n.body,
        timestamp: n.timestamp,
        thoughtId: Number(n.item_id),
        nodeId: n.id,
        color: n.color ?? null,
        replyCount: n.reply_count ?? 0,
        linkCount: n.link_count ?? 0,
        backlinkCount: n.backlink_count ?? 0,
        onRemove: thoughtCbs.onRemove,
        onExpandReplies: thoughtCbs.onExpandReplies,
        onExpandLinks: thoughtCbs.onExpandLinks,
        onExpandBacklinks: thoughtCbs.onExpandBacklinks,
      },
    };
  }

  if (n.node_type === 'document') {
    if (n.title == null) return null; // private doc not visible to current viewer
    return {
      id: String(n.id),
      type: 'document',
      position: { x: n.x, y: n.y },
      data: {
        nodeId: n.id,
        documentId: Number(n.item_id),
        title: n.title,
        body: n.body ?? '',
        updatedAt: n.updated_at,
        private: n.private,
        onRemove: thoughtCbs.onRemove,
      },
    };
  }

  if (n.node_type === 'framing') {
    return {
      id: String(n.id),
      type: 'framing',
      position: { x: n.x, y: n.y },
      data: {
        nodeId: n.id,
        framingId: Number(n.item_id),
        title: n.title,
        onRemove: thoughtCbs.onRemove,
      },
    };
  }

  const post = postsMap.get(n.item_id);
  if (!post) return null; // post not in manifest — skip

  return {
    id: String(n.id),
    type: 'post',
    position: { x: n.x, y: n.y },
    data: {
      nodeId: n.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date,
      tags: post.tags,
      color: post.color,
      onRemove: thoughtCbs.onRemove,
    },
  };
}

const KIND_COLORS: Record<string, string> = {
  reply: '#7aa2f7',
  link: '#9ece6a',
};

function framingEdgeToRFEdge(
  e: FramingEdgeType,
  onLabelChange: (edgeDbId: number, label: string) => void,
): Edge<LabeledEdgeData> {
  const color = e.kind ? KIND_COLORS[e.kind] : undefined;
  return {
    id: `e-${e.id}`,
    source: String(e.source_node_id),
    target: String(e.target_node_id),
    sourceHandle: e.source_handle ?? undefined,
    targetHandle: e.target_handle ?? undefined,
    type: 'labeled',
    markerEnd: { type: MarkerType.ArrowClosed, color },
    style: color ? { stroke: color } : undefined,
    data: { label: e.label, edgeDbId: e.id, kind: e.kind, onLabelChange },
  };
}

export function useFramingCanvas(framingId: number) {
  const { data, mutate } = useFraming(framingId);
  const { data: postsManifest } = usePostsManifest();
  const { secret } = useContext(AuthContext);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [composePosition, setComposePosition] = useState<{ x: number; y: number } | null>(null);

  // Refs mirror state so stable async callbacks can read the latest values.
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const postsMap = useMemo(() => {
    const m = new Map<string, PostSummary>();
    if (postsManifest) {
      for (const p of postsManifest) {
        m.set(p.slug, p);
      }
    }
    return m;
  }, [postsManifest]);

  // Debounced batch position sync
  const pendingPositions = useRef(new Map<string, { node_id: number; x: number; y: number }>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushPositions = useCallback(() => {
    if (!secret || pendingPositions.current.size === 0) return;
    const items = Array.from(pendingPositions.current.values());
    pendingPositions.current.clear();
    batchUpdateNodes(framingId, items, secret).catch(() => {});
  }, [framingId, secret]);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushPositions, 500);
  }, [flushPositions]);

  // Callbacks that need stable references
  const handleRemoveNode = useCallback(
    async (nodeId: number) => {
      if (!secret) return;
      const nodeIdStr = String(nodeId);
      setNodes((prev) => prev.filter((n) => n.id !== nodeIdStr));
      setEdges((prev) =>
        prev.filter(
          (e) => e.source !== nodeIdStr && e.target !== nodeIdStr,
        ),
      );
      try {
        await removeNodeFromFraming(framingId, nodeId, secret);
      } catch {
        mutate(undefined);
      }
    },
    [framingId, secret, mutate],
  );

  const handleLabelChange = useCallback(
    async (edgeDbId: number, label: string) => {
      if (!secret) return;
      setEdges((prev) =>
        prev.map((e) =>
          (e.data as LabeledEdgeData)?.edgeDbId === edgeDbId
            ? { ...e, data: { ...e.data as LabeledEdgeData, label } }
            : e,
        ),
      );
      try {
        await updateFramingEdge(framingId, edgeDbId, label, secret);
      } catch {
        mutate(undefined);
      }
    },
    [framingId, secret, mutate],
  );

  // Stable wrappers around the expand* implementations — declared after they
  // run, but bound here via refs so framing nodes can carry a single callback
  // identity across renders.
  const expandRepliesRef = useRef<(framingNodeId: number) => Promise<void>>(
    async () => {},
  );
  const expandLinksRef = useRef<(framingNodeId: number) => Promise<void>>(
    async () => {},
  );
  const expandBacklinksRef = useRef<(framingNodeId: number) => Promise<void>>(
    async () => {},
  );
  const handleExpandReplies = useCallback((framingNodeId: number) => {
    return expandRepliesRef.current(framingNodeId);
  }, []);
  const handleExpandLinks = useCallback((framingNodeId: number) => {
    return expandLinksRef.current(framingNodeId);
  }, []);
  const handleExpandBacklinks = useCallback((framingNodeId: number) => {
    return expandBacklinksRef.current(framingNodeId);
  }, []);

  const thoughtCbs = useMemo<ThoughtCallbacks>(() => ({
    onRemove: handleRemoveNode,
    onExpandReplies: handleExpandReplies,
    onExpandLinks: handleExpandLinks,
    onExpandBacklinks: handleExpandBacklinks,
  }), [handleRemoveNode, handleExpandReplies, handleExpandLinks, handleExpandBacklinks]);

  // Sync SWR data → local state on initial load / revalidation
  useEffect(() => {
    if (!data) return;
    const rfNodes = data.nodes
      .map((n) => framingNodeToRFNode(n, thoughtCbs, postsMap))
      .filter((n): n is Node<ThoughtNodeData | PostNodeData | DocumentNodeData | FramingNodeData> => n !== null);
    setNodes(rfNodes as Node[]);
    setEdges(data.edges.map((e) => framingEdgeToRFEdge(e, handleLabelChange)));
  }, [data, thoughtCbs, handleLabelChange, postsMap]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((prev) => applyNodeChanges(changes, prev));
      // Track position changes for batch sync
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id !== COMPOSE_NODE_ID) {
          pendingPositions.current.set(change.id, {
            node_id: Number(change.id),
            x: change.position.x,
            y: change.position.y,
          });
        }
      }
    },
    [],
  );

  const onNodeDragStop = useCallback(() => {
    scheduleFlush();
  }, [scheduleFlush]);

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((prev) => applyEdgeChanges(changes, prev));
    },
    [],
  );

  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      if (!secret) return;
      const sourceNodeId = Number(connection.source);
      const targetNodeId = Number(connection.target);
      try {
        const edge = await createFramingEdge(
          framingId, sourceNodeId, targetNodeId, secret,
          undefined, connection.sourceHandle, connection.targetHandle,
        );
        setEdges((prev) => [...prev, framingEdgeToRFEdge(edge, handleLabelChange)]);
      } catch {
        // ignore
      }
    },
    [framingId, secret, handleLabelChange],
  );

  const addNode = useCallback(
    async (
      nodeType: 'thought' | 'post' | 'document' | 'framing',
      itemId: string,
      displayData: Partial<ThoughtNodeData & PostNodeData & DocumentNodeData & FramingNodeData>,
      x: number,
      y: number,
    ) => {
      if (!secret) return;
      // Use a temp negative id for optimistic UI
      const tempId = -Date.now();
      const tempNode: Node = {
        id: String(tempId),
        type: nodeType,
        position: { x, y },
        data: {
          ...displayData,
          nodeId: tempId,
          onRemove: handleRemoveNode,
          ...(nodeType === 'thought'
            ? {
                onExpandReplies: handleExpandReplies,
                onExpandLinks: handleExpandLinks,
                onExpandBacklinks: handleExpandBacklinks,
              }
            : {}),
        },
      };
      setNodes((prev) => [...prev, tempNode]);
      try {
        const result = await addNodeToFraming(framingId, nodeType, itemId, x, y, secret);
        // Replace temp node with real one
        setNodes((prev) =>
          prev.map((n) =>
            n.id === String(tempId)
              ? { ...n, id: String(result.id), data: { ...n.data, nodeId: result.id } }
              : n,
          ),
        );
      } catch {
        setNodes((prev) => prev.filter((n) => n.id !== String(tempId)));
      }
    },
    [framingId, secret, handleRemoveNode],
  );

  const addThought = useCallback(
    (thoughtId: number, body: string, timestamp: number, x: number, y: number) => {
      return addNode('thought', String(thoughtId), {
        body,
        timestamp,
        thoughtId,
        color: null,
        replyCount: 0,
        linkCount: 0,
        backlinkCount: 0,
      } as any, x, y);
    },
    [addNode],
  );

  const addPost = useCallback(
    (slug: string, x: number, y: number) => {
      const post = postsMap.get(slug);
      if (!post) return;
      return addNode('post', slug, {
        slug: post.slug,
        title: post.title,
        description: post.description,
        date: post.date,
        tags: post.tags,
        color: post.color,
      } as any, x, y);
    },
    [addNode, postsMap],
  );

  const addDocument = useCallback(
    async (
      documentId: number,
      title: string,
      body: string,
      updatedAt: number,
      isPrivate: boolean,
      x: number,
      y: number,
    ) => {
      await addNode('document', String(documentId), {
        documentId,
        title,
        body,
        updatedAt,
        private: isPrivate,
      } as any, x, y);
      // Refetch so the body (not carried in the drag payload) is filled in.
      mutate(undefined);
    },
    [addNode, mutate],
  );

  const addFraming = useCallback(
    (targetFramingId: number, title: string | null, x: number, y: number) => {
      return addNode('framing', String(targetFramingId), {
        framingId: targetFramingId,
        title,
      } as any, x, y);
    },
    [addNode],
  );

  type ExpandItem = {
    id: number;
    body: string;
    timestamp: number;
    color: string | null;
    replyCount?: number;
  };
  type ExpansionDirection = 'down' | 'right' | 'left';
  type ExpansionConfig = {
    fetch: (parentThoughtId: number) => Promise<ExpandItem[]>;
    direction: ExpansionDirection;
    edgeKind: 'reply' | 'link';
    sourceFromParent: boolean; // true: parent → item; false: item → parent
    sourceHandle: string;
    targetHandle: string;
  };

  const runExpansion = useCallback(
    async (parentFramingNodeId: number, cfg: ExpansionConfig) => {
      if (!secret) return;

      const parent = nodesRef.current.find((n) => Number(n.id) === parentFramingNodeId);
      if (!parent || parent.type !== 'thought') return;
      const parentData = parent.data as ThoughtNodeData;

      let items: ExpandItem[];
      try {
        items = await cfg.fetch(parentData.thoughtId);
      } catch {
        return;
      }
      if (items.length === 0) return;

      const placedByThoughtId = new Map<number, number>();
      for (const n of nodesRef.current) {
        if (n.type === 'thought') {
          const d = n.data as ThoughtNodeData;
          placedByThoughtId.set(d.thoughtId, Number(n.id));
        }
      }

      const newItems = items.filter((r) => !placedByThoughtId.has(r.id));
      const newCount = newItems.length;

      // Layout: center the column/row of new nodes around the parent's mid-axis.
      const computePos = (newIdx: number) => {
        if (cfg.direction === 'down') {
          const totalW = newCount * (NODE_W + HGAP) - HGAP;
          const startX = parent.position.x + NODE_W / 2 - totalW / 2;
          return {
            x: startX + newIdx * (NODE_W + HGAP),
            y: parent.position.y + NODE_H + VGAP,
          };
        }
        const totalH = newCount * (NODE_H + VGAP) - VGAP;
        const startY = parent.position.y + NODE_H / 2 - totalH / 2;
        const x = cfg.direction === 'right'
          ? parent.position.x + NODE_W + HGAP
          : parent.position.x - NODE_W - HGAP;
        return { x, y: startY + newIdx * (NODE_H + VGAP) };
      };

      const existingEdgeKeys = new Set(
        edgesRef.current.map((e) => `${e.source}->${e.target}`),
      );

      let newIdx = 0;
      for (const item of items) {
        let itemFramingNodeId = placedByThoughtId.get(item.id);

        if (itemFramingNodeId == null) {
          const { x, y } = computePos(newIdx++);
          try {
            const result = await addNodeToFraming(
              framingId, 'thought', String(item.id), x, y, secret,
            );
            itemFramingNodeId = result.id;
            const newRfNode: Node = {
              id: String(result.id),
              type: 'thought',
              position: { x, y },
              data: {
                body: item.body,
                timestamp: item.timestamp,
                thoughtId: item.id,
                nodeId: result.id,
                color: item.color ?? null,
                replyCount: item.replyCount ?? 0,
                linkCount: 0,
                backlinkCount: 0,
                onRemove: handleRemoveNode,
                onExpandReplies: handleExpandReplies,
                onExpandLinks: handleExpandLinks,
                onExpandBacklinks: handleExpandBacklinks,
              } as ThoughtNodeData,
            };
            setNodes((prev) => [...prev, newRfNode]);
            placedByThoughtId.set(item.id, result.id);
          } catch {
            continue;
          }
        }

        const sourceId = cfg.sourceFromParent ? parentFramingNodeId : itemFramingNodeId;
        const targetId = cfg.sourceFromParent ? itemFramingNodeId : parentFramingNodeId;
        const edgeKey = `${sourceId}->${targetId}`;
        if (existingEdgeKeys.has(edgeKey)) continue;

        try {
          const edge = await createFramingEdge(
            framingId,
            sourceId,
            targetId,
            secret,
            undefined,
            cfg.sourceHandle,
            cfg.targetHandle,
            cfg.edgeKind,
          );
          setEdges((prev) => [...prev, framingEdgeToRFEdge(edge, handleLabelChange)]);
          existingEdgeKeys.add(edgeKey);
        } catch {
          // ignore
        }
      }

      // Refetch so newly placed nodes pick up real reply/link/backlink counts.
      mutate(undefined);
    },
    [framingId, secret, handleRemoveNode, handleExpandReplies, handleExpandLinks, handleExpandBacklinks, handleLabelChange, mutate],
  );

  const expandReplies = useCallback(
    (parentFramingNodeId: number) => runExpansion(parentFramingNodeId, {
      fetch: async (parentThoughtId) => {
        const thread = await getThread(parentThoughtId, secret ?? undefined);
        return thread.replies.map((r) => ({
          id: r.id,
          body: r.body,
          timestamp: r.timestamp,
          color: r.color,
          replyCount: r.reply_count,
        }));
      },
      direction: 'down',
      edgeKind: 'reply',
      sourceFromParent: true,
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    }),
    [runExpansion, secret],
  );

  const expandLinks = useCallback(
    (parentFramingNodeId: number) => runExpansion(parentFramingNodeId, {
      fetch: async (parentThoughtId) => {
        const related = await getRelated(parentThoughtId, secret ?? undefined);
        return related.outbound.map((r: RelatedItem) => ({
          id: r.id, body: r.body, timestamp: r.timestamp, color: r.color,
        }));
      },
      direction: 'right',
      edgeKind: 'link',
      sourceFromParent: true,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    }),
    [runExpansion, secret],
  );

  const expandBacklinks = useCallback(
    (parentFramingNodeId: number) => runExpansion(parentFramingNodeId, {
      fetch: async (parentThoughtId) => {
        const related = await getRelated(parentThoughtId, secret ?? undefined);
        return related.inbound.map((r: RelatedItem) => ({
          id: r.id, body: r.body, timestamp: r.timestamp, color: r.color,
        }));
      },
      direction: 'left',
      edgeKind: 'link',
      sourceFromParent: false,
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    }),
    [runExpansion, secret],
  );

  // Keep the stable wrappers pointing at the latest implementations.
  expandRepliesRef.current = expandReplies;
  expandLinksRef.current = expandLinks;
  expandBacklinksRef.current = expandBacklinks;

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      if (!secret) return;
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return;
      const dbId = (edge.data as LabeledEdgeData)?.edgeDbId;
      if (dbId == null) return;
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      try {
        await deleteFramingEdge(framingId, dbId, secret);
      } catch {
        mutate(undefined);
      }
    },
    [framingId, secret, edges, mutate],
  );

  // Compose node (double-click to create thought)
  const startCompose = useCallback(
    (x: number, y: number) => {
      if (!secret) return;
      setComposePosition({ x, y });
    },
    [secret],
  );

  const cancelCompose = useCallback(() => {
    setComposePosition(null);
    setNodes((prev) => prev.filter((n) => n.id !== COMPOSE_NODE_ID));
  }, []);

  const submitCompose = useCallback(
    async (body: string) => {
      if (!secret || !composePosition) return;
      setNodes((prev) => prev.filter((n) => n.id !== COMPOSE_NODE_ID));
      try {
        const thought = await postThought(body, secret);
        await addThought(thought.id, thought.body, thought.timestamp, composePosition.x, composePosition.y);
      } catch {
        // ignore
      }
      setComposePosition(null);
    },
    [secret, composePosition, addThought],
  );

  // Inject compose node when position is set
  useEffect(() => {
    if (composePosition) {
      const composeNode: Node = {
        id: COMPOSE_NODE_ID,
        type: 'compose',
        position: composePosition,
        data: { onSubmit: submitCompose, onCancel: cancelCompose },
      };
      setNodes((prev) => [...prev.filter((n) => n.id !== COMPOSE_NODE_ID), composeNode]);
    }
  }, [composePosition, submitCompose, cancelCompose]);

  const placedItemKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const n of nodes) {
      if (n.type === 'thought') {
        const d = n.data as ThoughtNodeData;
        keys.add(`thought:${d.thoughtId}`);
      } else if (n.type === 'post') {
        const d = n.data as PostNodeData;
        keys.add(`post:${d.slug}`);
      } else if (n.type === 'document') {
        const d = n.data as DocumentNodeData;
        keys.add(`document:${d.documentId}`);
      } else if (n.type === 'framing') {
        const d = n.data as FramingNodeData;
        keys.add(`framing:${d.framingId}`);
      }
    }
    return keys;
  }, [nodes]);

  const applyLayout = useCallback(
    (positions: Map<string, { x: number; y: number }>) => {
      if (!secret) return;
      setNodes((prev) =>
        prev.map((n) => {
          const pos = positions.get(n.id);
          return pos ? { ...n, position: pos } : n;
        }),
      );
      const items = Array.from(positions.entries()).map(([id, pos]) => ({
        node_id: Number(id),
        x: pos.x,
        y: pos.y,
      }));
      batchUpdateNodes(framingId, items, secret).catch(() => {});
    },
    [framingId, secret],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onNodeDragStop,
    onEdgesChange,
    onConnect,
    addThought,
    addPost,
    addDocument,
    addFraming,
    deleteEdge,
    startCompose,
    applyLayout,
    placedItemKeys,
    framing: data?.framing ?? null,
    loading: !data,
  };
}
