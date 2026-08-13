import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { app } from "../../rindle-client.ts";
import { FramingDetailPane } from "./FramingDetailPane.tsx";
import { FramingLabeledEdge, type FramingEdgeData } from "./FramingEdge.tsx";
import { FramingLeftPanel } from "./FramingLeftPanel.tsx";
import {
  FramingComposeNode,
  FramingNestedNode,
  FramingPostNode,
  FramingThoughtNode,
  type NestedFramingNodeData,
  type PostNodeData,
  type ThoughtNodeData,
} from "./FramingNodes.tsx";
import { useFramingCanvas } from "./useFramingCanvas.ts";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 150;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 80;

const nodeTypes = {
  thought: FramingThoughtNode,
  post: FramingPostNode,
  framing: FramingNestedNode,
  compose: FramingComposeNode,
} satisfies NodeTypes;

const edgeTypes = {
  labeled: FramingLabeledEdge,
} satisfies EdgeTypes;

function hierarchicalLayout(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const contentNodes = nodes.filter((node) => node.type === "thought" || node.type === "post" || node.type === "framing");
  if (contentNodes.length === 0) return new Map();
  const ids = new Set(contentNodes.map((node) => node.id));
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const id of ids) { children.set(id, []); inDegree.set(id, 0); }
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    children.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const roots = [...ids].filter((id) => inDegree.get(id) === 0);
  if (roots.length === 0) roots.push(...ids);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const backEdges = new Set<string>();
  for (const root of roots) {
    if (visited.has(root)) continue;
    const stack = [{ id: root, childIndex: 0 }];
    visiting.add(root);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const nextChildren = children.get(frame.id) ?? [];
      if (frame.childIndex < nextChildren.length) {
        const child = nextChildren[frame.childIndex++];
        if (visiting.has(child)) backEdges.add(`${frame.id}\t${child}`);
        else if (!visited.has(child)) { visiting.add(child); stack.push({ id: child, childIndex: 0 }); }
      } else {
        visiting.delete(frame.id);
        visited.add(frame.id);
        stack.pop();
      }
    }
  }
  for (const key of backEdges) {
    const [source, target] = key.split("\t");
    children.set(source, (children.get(source) ?? []).filter((id) => id !== target));
  }

  const layer = new Map<string, number>();
  const queue = roots.map((id) => { layer.set(id, 0); return id; });
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const currentLayer = layer.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      if ((layer.get(child) ?? -1) < currentLayer + 1) {
        layer.set(child, currentLayer + 1);
        queue.push(child);
      }
    }
  }
  for (const id of ids) if (!layer.has(id)) layer.set(id, 0);

  const layers = new Map<number, string[]>();
  for (const [id, depth] of layer) layers.set(depth, [...(layers.get(depth) ?? []), id]);
  const widest = Math.max(...[...layers.values()].map((group) => group.length));
  const totalWidth = widest * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
  const positions = new Map<string, { x: number; y: number }>();
  for (const [depth, group] of layers) {
    const rowWidth = group.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
    const offset = (totalWidth - rowWidth) / 2;
    group.forEach((id, index) => positions.set(id, {
      x: offset + index * (NODE_WIDTH + HORIZONTAL_GAP),
      y: depth * (NODE_HEIGHT + VERTICAL_GAP),
    }));
  }
  return positions;
}

function exportFraming(name: string, isPrivate: boolean, nodes: Node[], edges: Edge[]) {
  const identities = new Map<string, string>();
  const exportedNodes = nodes.flatMap((node) => {
    if (node.type === "thought") {
      const data = node.data as ThoughtNodeData;
      const identity = `thought:${data.thoughtId}`;
      identities.set(node.id, identity);
      return [{ id: identity, type: "thought", item_id: data.thoughtId, x: node.position.x, y: node.position.y }];
    }
    if (node.type === "post") {
      const data = node.data as PostNodeData;
      const identity = `post:${data.slug}`;
      identities.set(node.id, identity);
      return [{ id: identity, type: "post", item_id: data.slug, x: node.position.x, y: node.position.y }];
    }
    if (node.type === "framing") {
      const data = node.data as NestedFramingNodeData;
      const identity = `framing:${data.framingId}`;
      identities.set(node.id, identity);
      return [{ id: identity, type: "framing", item_id: data.framingId, x: node.position.x, y: node.position.y }];
    }
    return [];
  });
  const exportedEdges = edges.flatMap((edge) => {
    const source = identities.get(edge.source);
    const target = identities.get(edge.target);
    if (!source || !target) return [];
    const data = edge.data as FramingEdgeData | undefined;
    return [{
      source,
      target,
      label: data?.label ?? null,
      kind: data?.kind ?? null,
      source_handle: edge.sourceHandle ?? null,
      target_handle: edge.targetHandle ?? null,
    }];
  });
  const payload = {
    version: 1,
    name,
    private: isPrivate ? 1 : 0,
    exported_at: new Date().toISOString(),
    nodes: exportedNodes,
    edges: exportedEdges,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name.replace(/[^a-z0-9_-]/gi, "-") || "framing"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FramingCanvasView({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const {
    nodes,
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
    framing,
    loading,
    missing,
  } = useFramingCanvas(id, isAdmin);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const lastPaneClick = useRef<{ at: number; x: number; y: number } | null>(null);
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null);

  const rename = useCallback((name: string) => {
    if (!isAdmin) return;
    app.mutate.updateFraming({ id, name, updatedAt: Date.now() });
  }, [id, isAdmin]);

  const setPrivacy = useCallback((isPrivate: boolean) => {
    if (!isAdmin) return;
    app.mutate.updateFraming({ id, private: isPrivate ? 1 : 0, updatedAt: Date.now() });
  }, [id, isAdmin]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!isAdmin || !flowRef.current) return;
    const itemType = event.dataTransfer.getData("application/node-type");
    const itemId = event.dataTransfer.getData("application/item-id");
    if (!itemId || (itemType !== "thought" && itemType !== "post" && itemType !== "framing")) return;
    const position = flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(itemType, itemId, position.x, position.y);
  }, [addNode, isAdmin]);

  const onPaneClick = useCallback((event: ReactMouseEvent) => {
    if (!isAdmin) return;
    const now = Date.now();
    const previous = lastPaneClick.current;
    if (previous && now - previous.at < 300 && Math.abs(event.clientX - previous.x) < 5 && Math.abs(event.clientY - previous.y) < 5) {
      lastPaneClick.current = null;
      const position = flowRef.current?.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (position) startCompose(position.x, position.y);
    } else {
      lastPaneClick.current = { at: now, x: event.clientX, y: event.clientY };
    }
  }, [isAdmin, startCompose]);

  if (loading) return <div className="framing-route-status">Loading framing…</div>;
  if (missing || !framing) return <div className="framing-route-status">Framing not found.</div>;

  return (
    <div className="framing-canvas-wrap">
      <FramingLeftPanel
        framingId={id}
        framingName={framing.name}
        framingPrivate={framing.private === 1}
        placedItemKeys={placedItemKeys}
        isAdmin={isAdmin}
        onRename={rename}
        onPrivacyChange={setPrivacy}
      />
      <div className="framing-canvas" tabIndex={0} onKeyDown={(event) => {
        if (event.key !== "Backspace" && event.key !== "Delete") return;
        for (const edge of edges) if (edge.selected) deleteEdge(edge.id);
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => { flowRef.current = instance; }}
          onDragOver={(event) => { if (isAdmin) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
          onDrop={onDrop}
          onPaneClick={onPaneClick}
          onNodeClick={(_event, node) => {
            if (node.type === "thought") setSelectedThoughtId((node.data as ThoughtNodeData).thoughtId);
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={isAdmin}
          nodesConnectable={isAdmin}
          elementsSelectable
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          <div className="framing-toolbar">
            {isAdmin ? <span className="framing-toolbar-hint">Double-click canvas to add a thought</span> : null}
            {isAdmin ? (
              <button type="button" className="framing-toolbar-btn" onClick={() => applyLayout(hierarchicalLayout(nodes, edges))}>
                Layout
              </button>
            ) : null}
            <button type="button" className="framing-toolbar-btn" onClick={() => exportFraming(framing.name, framing.private === 1, nodes, edges)}>
              Export
            </button>
          </div>
        </ReactFlow>
      </div>
      {selectedThoughtId ? (
        <FramingDetailPane thoughtId={selectedThoughtId} isAdmin={isAdmin} onClose={() => setSelectedThoughtId(null)} />
      ) : null}
    </div>
  );
}
