import { useCallback, useContext, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
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
import { DocumentNode, type DocumentNodeData } from './DocumentNode';
import { LabeledEdge, type LabeledEdgeData } from './LabeledEdge';
import { ComposeNode } from './ComposeNode';
import { FramingLeftPanel } from './FramingLeftPanel';
import { FramingDetailPane } from './FramingDetailPane';
import { updateFraming } from '../../api';
import { AuthContext } from '../../App';
import type { Node, Edge } from '@xyflow/react';

const NODE_W = 250;
const NODE_H = 150;
const HGAP = 60;
const VGAP = 80;

function hierarchicalLayout(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  // Only layout real content nodes (thought/post/document)
  const layoutNodes = nodes.filter(
    (n) => n.type === 'thought' || n.type === 'post' || n.type === 'document',
  );
  if (layoutNodes.length === 0) return new Map();

  const ids = new Set(layoutNodes.map((n) => n.id));
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of ids) {
    children.set(id, []);
    inDegree.set(id, 0);
  }
  // Only consider edges where both endpoints exist
  for (const e of edges) {
    if (ids.has(e.source) && ids.has(e.target)) {
      children.get(e.source)!.push(e.target);
      inDegree.set(e.target, inDegree.get(e.target)! + 1);
    }
  }

  const roots = [...ids].filter((id) => inDegree.get(id) === 0);
  if (roots.length === 0) roots.push(...ids); // cycle fallback

  // Break cycles via iterative DFS; remove back-edges so BFS runs on a DAG
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const backEdges = new Set<string>();
  const dfsStack: { node: string; childIdx: number }[] = [];
  for (const root of roots) {
    if (visited.has(root)) continue;
    dfsStack.push({ node: root, childIdx: 0 });
    visiting.add(root);
    while (dfsStack.length > 0) {
      const frame = dfsStack[dfsStack.length - 1];
      const kids = children.get(frame.node)!;
      if (frame.childIdx < kids.length) {
        const child = kids[frame.childIdx++];
        if (visiting.has(child)) {
          backEdges.add(`${frame.node}\t${child}`);
        } else if (!visited.has(child)) {
          visiting.add(child);
          dfsStack.push({ node: child, childIdx: 0 });
        }
      } else {
        visiting.delete(frame.node);
        visited.add(frame.node);
        dfsStack.pop();
      }
    }
  }
  for (const key of backEdges) {
    const [src, tgt] = key.split('\t');
    children.set(src, children.get(src)!.filter((c) => c !== tgt));
  }

  // Longest-path layering via BFS
  const layer = new Map<string, number>();
  const queue = roots.map((id) => {
    layer.set(id, 0);
    return id;
  });
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const curLayer = layer.get(cur)!;
    for (const child of children.get(cur)!) {
      const prev = layer.get(child);
      if (prev === undefined || curLayer + 1 > prev) {
        layer.set(child, curLayer + 1);
        queue.push(child);
      }
    }
  }

  // Group by layer
  const layers = new Map<number, string[]>();
  for (const [id, l] of layer) {
    if (!layers.has(l)) layers.set(l, []);
    layers.get(l)!.push(id);
  }

  const positions = new Map<string, { x: number; y: number }>();
  let maxWidth = 0;
  for (const group of layers.values()) {
    if (group.length > maxWidth) maxWidth = group.length;
  }
  const totalW = maxWidth * (NODE_W + HGAP) - HGAP;

  for (const [l, group] of layers) {
    const rowW = group.length * (NODE_W + HGAP) - HGAP;
    const offsetX = (totalW - rowW) / 2;
    group.forEach((id, i) => {
      positions.set(id, {
        x: offsetX + i * (NODE_W + HGAP),
        y: l * (NODE_H + VGAP),
      });
    });
  }

  return positions;
}

// Cast to any: @xyflow/react bundles @types/react@18 which conflicts with project's @types/react@19
const nodeTypes = {
  thought: ThoughtNode,
  post: PostNode,
  document: DocumentNode,
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
    .filter((n) => n.type === 'thought' || n.type === 'post' || n.type === 'document')
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
      if (n.type === 'document') {
        const d = n.data as DocumentNodeData;
        rfIdToExportId.set(n.id, `doc:${d.documentId}`);
        return {
          id: d.documentId,
          type: 'document' as const,
          x: n.position.x,
          y: n.position.y,
          title: d.title,
          body: d.body,
          updated_at: d.updatedAt,
          private: d.private,
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
        description: d.description,
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
    addDocument,
    deleteEdge,
    startCompose,
    applyLayout,
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
  const [selectedThoughtId, setSelectedThoughtId] = useState<number | null>(null);

  const handleNodeClick = useCallback((_e: ReactMouseEvent, node: Node) => {
    if (node.type !== 'thought') return;
    const data = node.data as ThoughtNodeData;
    setSelectedThoughtId(data.thoughtId);
  }, []);

  const closeDetailPane = useCallback(() => setSelectedThoughtId(null), []);

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
      } else if (nodeType === 'document') {
        const docId = e.dataTransfer.getData('application/item-id');
        const title = e.dataTransfer.getData('application/document-title');
        const body = e.dataTransfer.getData('application/document-body');
        const updatedAt = e.dataTransfer.getData('application/document-updated');
        const isPrivate = e.dataTransfer.getData('application/document-private') === '1';
        if (!docId) return;
        addDocument(
          Number(docId),
          title,
          body,
          Number(updatedAt) || 0,
          isPrivate,
          position.x,
          position.y,
        );
      } else {
        const thoughtId = e.dataTransfer.getData('application/thought-id');
        const body = e.dataTransfer.getData('application/thought-body');
        const timestamp = e.dataTransfer.getData('application/thought-timestamp');
        if (!thoughtId) return;
        addThought(Number(thoughtId), body, Number(timestamp), position.x, position.y);
      }
    },
    [addThought, addPost, addDocument],
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
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
        >
          <Background />
          <Controls />
          <MiniMap />
          <div className="framing-toolbar">
            <button
              className="framing-toolbar-btn"
              onClick={() => applyLayout(hierarchicalLayout(nodes, edges))}
              title="Auto-arrange nodes hierarchically"
            >
              Layout
            </button>
            <button
              className="framing-toolbar-btn"
              onClick={() => exportFraming(framing?.name ?? 'framing', nodes, edges)}
              title="Export as JSON"
            >
              Export
            </button>
          </div>
        </ReactFlow>
      </div>
      {selectedThoughtId !== null && (
        <FramingDetailPane
          key={selectedThoughtId}
          thoughtId={selectedThoughtId}
          onClose={closeDetailPane}
        />
      )}
    </div>
  );
}
