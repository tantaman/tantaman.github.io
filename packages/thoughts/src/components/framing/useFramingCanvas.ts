import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react';
import { useFraming } from '../../hooks/useCache';
import { AuthContext } from '../../App';
import {
  addThoughtToFraming,
  removeThoughtFromFraming,
  batchUpdatePlacements,
  createFramingEdge,
  updateFramingEdge,
  deleteFramingEdge,
  postThought,
} from '../../api';
import type { ThoughtNodeData } from './ThoughtNode';
import type { LabeledEdgeData } from './LabeledEdge';
import type { FramingPlacement, FramingEdge as FramingEdgeType } from '../../types';

const COMPOSE_NODE_ID = '__compose__';

function placementToNode(p: FramingPlacement, onRemove: (id: number) => void): Node<ThoughtNodeData> {
  return {
    id: String(p.thought_id),
    type: 'thought',
    position: { x: p.x, y: p.y },
    data: { body: p.body, timestamp: p.timestamp, thoughtId: p.thought_id, onRemove },
  };
}

function framingEdgeToRFEdge(
  e: FramingEdgeType,
  onLabelChange: (edgeDbId: number, label: string) => void,
): Edge<LabeledEdgeData> {
  return {
    id: `e-${e.id}`,
    source: String(e.source_thought_id),
    target: String(e.target_thought_id),
    type: 'labeled',
    data: { label: e.label, edgeDbId: e.id, onLabelChange },
  };
}

export function useFramingCanvas(framingId: number) {
  const { data, mutate } = useFraming(framingId);
  const { secret } = useContext(AuthContext);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [composePosition, setComposePosition] = useState<{ x: number; y: number } | null>(null);

  // Debounced batch position sync
  const pendingPositions = useRef(new Map<string, { x: number; y: number }>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flushPositions = useCallback(() => {
    if (!secret || pendingPositions.current.size === 0) return;
    const thoughts = Array.from(pendingPositions.current.entries()).map(([id, pos]) => ({
      thought_id: Number(id),
      x: pos.x,
      y: pos.y,
    }));
    pendingPositions.current.clear();
    batchUpdatePlacements(framingId, thoughts, secret).catch(() => {});
  }, [framingId, secret]);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushPositions, 500);
  }, [flushPositions]);

  // Callbacks that need stable references
  const handleRemoveThought = useCallback(
    async (thoughtId: number) => {
      if (!secret) return;
      setNodes((prev) => prev.filter((n) => n.id !== String(thoughtId)));
      setEdges((prev) =>
        prev.filter(
          (e) => e.source !== String(thoughtId) && e.target !== String(thoughtId),
        ),
      );
      try {
        await removeThoughtFromFraming(framingId, thoughtId, secret);
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
    setNodes(data.thoughts.map((p) => placementToNode(p, handleRemoveThought)));
    setEdges(data.edges.map((e) => framingEdgeToRFEdge(e, handleLabelChange)));
  }, [data, handleRemoveThought, handleLabelChange]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((prev) => applyNodeChanges(changes, prev));
      // Track position changes for batch sync
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.id !== COMPOSE_NODE_ID) {
          pendingPositions.current.set(change.id, change.position);
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
      const sourceId = Number(connection.source);
      const targetId = Number(connection.target);
      try {
        const edge = await createFramingEdge(framingId, sourceId, targetId, secret);
        setEdges((prev) => [...prev, framingEdgeToRFEdge(edge, handleLabelChange)]);
      } catch {
        // ignore
      }
    },
    [framingId, secret, handleLabelChange],
  );

  const addThought = useCallback(
    async (thoughtId: number, body: string, timestamp: number, x: number, y: number) => {
      if (!secret) return;
      const tempNode = placementToNode(
        { thought_id: thoughtId, x, y, w: null, h: null, body, timestamp },
        handleRemoveThought,
      );
      setNodes((prev) => [...prev, tempNode]);
      try {
        await addThoughtToFraming(framingId, thoughtId, x, y, secret);
      } catch {
        setNodes((prev) => prev.filter((n) => n.id !== String(thoughtId)));
      }
    },
    [framingId, secret, handleRemoveThought],
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

  const placedThoughtIds = useMemo(
    () => new Set(nodes.filter((n) => n.type === 'thought').map((n) => Number(n.id))),
    [nodes],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onNodeDragStop,
    onEdgesChange,
    onConnect,
    addThought,
    deleteEdge,
    startCompose,
    placedThoughtIds,
    framing: data?.framing ?? null,
    loading: !data,
  };
}
