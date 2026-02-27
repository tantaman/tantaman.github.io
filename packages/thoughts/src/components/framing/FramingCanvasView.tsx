import { useCallback, useContext, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSWRConfig } from 'swr';
import { useFramingCanvas } from './useFramingCanvas';
import { ThoughtNode, type ThoughtNodeData } from './ThoughtNode';
import { PostNode, type PostNodeData } from './PostNode';
import { LabeledEdge, type LabeledEdgeData } from './LabeledEdge';
import { ComposeNode } from './ComposeNode';
import { FramingLeftPanel } from './FramingLeftPanel';
import { updateFraming } from '../../api';
import { AuthContext } from '../../App';
import type { Node, Edge } from '@xyflow/react';

// Cast to any: @xyflow/react bundles @types/react@18 which conflicts with project's @types/react@19
const nodeTypes = {
  thought: ThoughtNode,
  post: PostNode,
  compose: ComposeNode,
} as any;

const edgeTypes = {
  labeled: LabeledEdge,
} as any;

function exportFraming(
  framingName: string,
  nodes: Node[],
  edges: Edge[],
) {
  // Map ReactFlow node ID → exported node ID
  const rfIdToExportId = new Map<string, number | string>();

  const exportedNodes = nodes
    .filter((n) => n.type === 'thought' || n.type === 'post')
    .map((n) => {
      if (n.type === 'thought') {
        const d = n.data as ThoughtNodeData;
        rfIdToExportId.set(n.id, d.thoughtId);
        return {
          id: d.thoughtId,
          type: 'thought' as const,
          x: n.position.x,
          y: n.position.y,
          body: d.body,
          timestamp: d.timestamp,
          color: d.color ?? null,
        };
      }
      const d = n.data as PostNodeData;
      rfIdToExportId.set(n.id, d.slug);
      return {
        id: d.slug,
        type: 'post' as const,
        x: n.position.x,
        y: n.position.y,
        title: d.title,
        slug: d.slug,
        summary: d.summary,
        date: d.date,
        tags: d.tags,
      };
    });

  const exportedEdges = edges
    .filter((e) => rfIdToExportId.has(e.source) && rfIdToExportId.has(e.target))
    .map((e) => {
      const d = e.data as LabeledEdgeData | undefined;
      return {
        source: rfIdToExportId.get(e.source)!,
        target: rfIdToExportId.get(e.target)!,
        label: d?.label ?? null,
      };
    });

  const payload = {
    name: framingName,
    exported_at: new Date().toISOString(),
    nodes: exportedNodes,
    edges: exportedEdges,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${framingName.replace(/[^a-z0-9_-]/gi, '-') || 'framing'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FramingCanvasView({ id }: { id: number }) {
  const {
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
    framing,
    loading,
  } = useFramingCanvas(id);

  const { secret } = useContext(AuthContext);
  const { mutate } = useSWRConfig();

  const handleRename = useCallback(
    async (name: string) => {
      if (!secret) return;
      try {
        await updateFraming(id, { name }, secret);
        mutate(`framing-${id}`);
      } catch {
        // ignore
      }
    },
    [id, secret, mutate],
  );

  const rfRef = useRef<ReactFlowInstance | null>(null);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!rfRef.current) return;

      const nodeType = e.dataTransfer.getData('application/node-type') || 'thought';
      const position = rfRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      if (nodeType === 'post') {
        const slug = e.dataTransfer.getData('application/item-id');
        if (!slug) return;
        addPost(slug, position.x, position.y);
      } else {
        const thoughtId = e.dataTransfer.getData('application/thought-id');
        const body = e.dataTransfer.getData('application/thought-body');
        const timestamp = e.dataTransfer.getData('application/thought-timestamp');
        if (!thoughtId) return;
        addThought(Number(thoughtId), body, Number(timestamp), position.x, position.y);
      }
    },
    [addThought, addPost],
  );

  const lastPaneClick = useRef<{ time: number; x: number; y: number } | null>(null);

  const handlePaneClick = useCallback(
    (e: ReactMouseEvent) => {
      const now = Date.now();
      const prev = lastPaneClick.current;
      if (prev && now - prev.time < 300 && Math.abs(e.clientX - prev.x) < 5 && Math.abs(e.clientY - prev.y) < 5) {
        lastPaneClick.current = null;
        if (!rfRef.current) return;
        const position = rfRef.current.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        startCompose(position.x, position.y);
      } else {
        lastPaneClick.current = { time: now, x: e.clientX, y: e.clientY };
      }
    },
    [startCompose],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selected = edges.filter((edge) => edge.selected);
        for (const edge of selected) {
          deleteEdge(edge.id);
        }
      }
    },
    [edges, deleteEdge],
  );

  if (loading) {
    return (
      <div className="framing-canvas-wrap">
        <div className="thought-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="framing-canvas-wrap">
      <FramingLeftPanel
        framingName={framing?.name ?? ''}
        placedItemKeys={placedItemKeys}
        onRename={handleRename}
      />
      <div className="framing-canvas" onKeyDown={onKeyDown} tabIndex={0}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => {
            rfRef.current = instance;
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
        >
          <Background />
          <Controls />
          <MiniMap />
          <button
            className="framing-export-btn"
            onClick={() => exportFraming(framing?.name ?? 'framing', nodes, edges)}
            title="Export as JSON"
          >
            Export
          </button>
        </ReactFlow>
      </div>
    </div>
  );
}
