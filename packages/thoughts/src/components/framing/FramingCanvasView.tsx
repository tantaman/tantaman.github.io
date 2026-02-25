import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFramingCanvas } from './useFramingCanvas';
import { ThoughtNode } from './ThoughtNode';
import { PostNode } from './PostNode';
import { LabeledEdge } from './LabeledEdge';
import { ComposeNode } from './ComposeNode';
import { FramingLeftPanel } from './FramingLeftPanel';

// Cast to any: @xyflow/react bundles @types/react@18 which conflicts with project's @types/react@19
const nodeTypes = {
  thought: ThoughtNode,
  post: PostNode,
  compose: ComposeNode,
} as any;

const edgeTypes = {
  labeled: LabeledEdge,
} as any;

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
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
