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
} from '../../api';
import type { ThoughtNodeData } from './ThoughtNode';
import type { PostNodeData } from './PostNode';
import type { LabeledEdgeData } from './LabeledEdge';
import type { FramingNode, FramingEdge as FramingEdgeType, PostSummary } from '../../types';

const COMPOSE_NODE_ID = '__compose__';

function framingNodeToRFNode(
  n: FramingNode,
  onRemove: (nodeId: number) => void,
  postsMap: Map<string, PostSummary>,
): Node<ThoughtNodeData | PostNodeData> | null {
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
        onRemove,
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
      summary: post.summary,
      date: post.date,
      tags: post.tags,
      color: post.color,
      onRemove,
    },
  };
}

function framingEdgeToRFEdge(
  e: FramingEdgeType,
  onLabelChange: (edgeDbId: number, label: string) => void,
): Edge<LabeledEdgeData> {
  return {
    id: `e-${e.id}`,
    source: String(e.source_node_id),
    target: String(e.target_node_id),
    sourceHandle: e.source_handle ?? undefined,
    targetHandle: e.target_handle ?? undefined,
    type: 'labeled',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { label: e.label, edgeDbId: e.id, onLabelChange },
  };
}

export function useFramingCanvas(framingId: number) {
  const { data, mutate } = useFraming(framingId);
  const { data: postsManifest } = usePostsManifest();
  const { secret } = useContext(AuthContext);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [composePosition, setComposePosition] = useState<{ x: number; y: number } | null>(null);

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

  // Sync SWR data → local state on initial load / revalidation
  useEffect(() => {
    if (!data) return;
    const rfNodes = data.nodes
      .map((n) => framingNodeToRFNode(n, handleRemoveNode, postsMap))
      .filter((n): n is Node<ThoughtNodeData | PostNodeData> => n !== null);
    setNodes(rfNodes as Node[]);
    setEdges(data.edges.map((e) => framingEdgeToRFEdge(e, handleLabelChange)));
  }, [data, handleRemoveNode, handleLabelChange, postsMap]);

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
      nodeType: 'thought' | 'post',
      itemId: string,
      displayData: Partial<ThoughtNodeData & PostNodeData>,
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
        data: { ...displayData, nodeId: tempId, onRemove: handleRemoveNode },
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
        summary: post.summary,
        date: post.date,
        tags: post.tags,
        color: post.color,
      } as any, x, y);
    },
    [addNode, postsMap],
  );

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
      }
    }
    return keys;
  }, [nodes]);

  return {
    nodes,
    edges,
    onNodesChange,
    onNodeDragStop,
    onEdgesChange,
    onConnect,
    addThought,
    addPost,
    deleteEdge,
    startCompose,
    placedItemKeys,
    framing: data?.framing ?? null,
    loading: !data,
  };
}
