import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRoot } from "@rindle/react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { ExploreNodeRow } from "../../schema.local.ts";
import { formatDate, parseList } from "../../lib/format.ts";
import { pasteDate } from "../../lib/paste.ts";
import { formatThoughtTime, thoughtEpochMs } from "../../lib/thoughts.ts";
import { currentQueryContext } from "../../rindle-client.ts";
import {
  explorePastesByIdsQuery,
  explorePostsByIdsQuery,
  exploreThoughtsByIdsQuery,
} from "../Explore.queries.ts";
import { ExploreItemNode, type ExploreFlowNode } from "./ExploreNodes.tsx";
import { ExplorePanel } from "./ExplorePanel.tsx";
import type { ExploreExpansionKind, ExploreItem, ExploreItemKind } from "./types.ts";
import { useExploreCandidates } from "./useExploreCandidates.ts";
import { useExploreLocalGraph } from "./useExploreLocalGraph.ts";

const nodeTypes = { exploreItem: ExploreItemNode };

const EDGE_STYLE: Record<string, { color: string; dash?: string }> = {
  link: { color: "#6b9b58" },
  reply: { color: "#6f91d8" },
  fork: { color: "#cc7e54" },
  similar: { color: "#9a77c5", dash: "7 5" },
  curated: { color: "#c49342", dash: "3 4" },
  temporal: { color: "#8b8791", dash: "2 7" },
};

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[`#>*_~|]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  const clean = plainText(value);
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

function validKind(value: string): value is ExploreItemKind {
  return value === "thought" || value === "post" || value === "paste";
}

function placeholderItem(row: ExploreNodeRow): ExploreItem {
  const kind = validKind(row.itemKind) ? row.itemKind : "thought";
  return {
    kind,
    id: row.itemId,
    title: "Unavailable content",
    preview: "This item is missing, private, or still loading.",
    timestamp: 0,
    date: "",
    color: null,
  };
}

export function ExploreCanvas() {
  const graph = useExploreLocalGraph();
  const flowRef = useRef<ReactFlowInstance<ExploreFlowNode, Edge> | null>(null);
  const [flowNodes, setFlowNodes] = useState<ExploreFlowNode[]>([]);
  const [status, setStatus] = useState("Search for something to begin, or reopen a local trail.");
  const [pendingExpansion, setPendingExpansion] = useState<{ nodeId: string; kind: ExploreExpansionKind } | null>(null);

  const ids = useMemo(() => {
    const grouped: Record<ExploreItemKind, string[]> = { thought: [], post: [], paste: [] };
    for (const row of graph.nodes) if (validKind(row.itemKind)) grouped[row.itemKind].push(row.itemId);
    for (const kind of Object.keys(grouped) as ExploreItemKind[]) grouped[kind].sort();
    return grouped;
  }, [graph.nodes]);
  const context = currentQueryContext();
  const [thoughts] = useRoot(exploreThoughtsByIdsQuery, { ids: ids.thought }, context);
  const [posts] = useRoot(explorePostsByIdsQuery, { ids: ids.post });
  const [pastes] = useRoot(explorePastesByIdsQuery, { ids: ids.paste }, context);

  const items = useMemo(() => {
    const map = new Map<string, ExploreItem>();
    for (const row of thoughts) {
      map.set(`thought:${row.id}`, {
        kind: "thought",
        id: row.id,
        title: truncate(row.body, 78) || "Untitled thought",
        preview: truncate(row.body, 190),
        timestamp: thoughtEpochMs(row.createdAt),
        date: formatThoughtTime(row.createdAt),
        color: row.color,
        meta: row.private === 1 ? "private" : undefined,
        directCount: (row.replyCount ?? 0) + (row.linkCount ?? 0) + (row.backlinkCount ?? 0),
      });
    }
    for (const row of posts) {
      const tags = parseList(row.tags);
      map.set(`post:${row.id}`, {
        kind: "post",
        id: row.id,
        title: row.title,
        preview: truncate(row.description, 190),
        timestamp: row.publishedAt,
        date: formatDate(row.date),
        color: row.color,
        meta: tags.slice(0, 3).join(" · "),
      });
    }
    for (const row of pastes) {
      map.set(`paste:${row.id}`, {
        kind: "paste",
        id: row.id,
        title: row.title?.trim() || truncate(row.excerpt, 78) || "Untitled paste",
        preview: truncate(row.excerpt, 190),
        timestamp: row.createdAt,
        date: pasteDate(row.sharedAt ?? row.createdAt),
        color: null,
        meta: row.language,
        directCount: (row.forkCount ?? 0) + (row.parentId ? 1 : 0),
      });
    }
    return map;
  }, [pastes, posts, thoughts]);

  const focusedNode = useMemo(() => {
    const requested = graph.view?.focusedNodeId;
    return graph.nodes.find((row) => row.id === requested)
      ?? graph.nodes.find((row) => row.pinned === 1)
      ?? graph.nodes[0]
      ?? null;
  }, [graph.nodes, graph.view?.focusedNodeId]);
  const focusedItem = focusedNode ? items.get(`${focusedNode.itemKind}:${focusedNode.itemId}`) ?? null : null;
  const discovery = useExploreCandidates(focusedNode, focusedItem);

  const requestExpansion = useCallback((nodeId: string, kind: ExploreExpansionKind) => {
    setPendingExpansion({ nodeId, kind });
    if (focusedNode?.id !== nodeId) void graph.focusNode(nodeId);
  }, [focusedNode?.id, graph.focusNode]);

  useEffect(() => {
    if (!pendingExpansion || focusedNode?.id !== pendingExpansion.nodeId) return;
    if (!discovery.ready[pendingExpansion.kind]) {
      setStatus(`Loading ${pendingExpansion.kind} connections…`);
      return;
    }
    const request = pendingExpansion;
    setPendingExpansion(null);
    const candidates = discovery.candidates[request.kind];
    if (candidates.length === 0) {
      setStatus(`No ${request.kind} connections found for this node.`);
      return;
    }
    void graph.addCandidates(focusedNode, candidates).then((added) => {
      setStatus(added > 0
        ? `Added ${added} new ${request.kind} ${added === 1 ? "node" : "nodes"}. Existing connections were kept.`
        : "Those connections are already on this trail.");
      window.setTimeout(() => flowRef.current?.fitView({ padding: 0.18, duration: 420 }), 30);
    });
  }, [discovery.candidates, discovery.ready, focusedNode, graph.addCandidates, pendingExpansion]);

  const derivedNodes = useMemo<ExploreFlowNode[]>(() => graph.nodes.map((row) => {
    const item = items.get(`${row.itemKind}:${row.itemId}`) ?? placeholderItem(row);
    return {
      id: row.id,
      type: "exploreItem",
      position: { x: row.x, y: row.y },
      data: {
        nodeId: row.id,
        item,
        pinned: row.pinned === 1,
        focused: row.id === focusedNode?.id,
        discoveredBy: row.discoveredBy,
        onFocus: (id: string) => { void graph.focusNode(id); },
        onTogglePinned: (id: string) => { void graph.togglePinned(id); },
        onExpandMixed: (id: string) => requestExpansion(id, "mixed"),
        onCollapse: (id: string) => {
          void graph.collapseBranch(id).then((removed) => setStatus(removed > 0
            ? `Collapsed ${removed} unpinned ${removed === 1 ? "node" : "nodes"}.`
            : "There is no unpinned branch to collapse."));
        },
      },
    };
  }), [focusedNode?.id, graph.collapseBranch, graph.focusNode, graph.nodes, graph.togglePinned, items, requestExpansion]);

  useEffect(() => setFlowNodes(derivedNodes), [derivedNodes]);
  useEffect(() => {
    if (!graph.activeSessionId || graph.view || derivedNodes.length === 0) return;
    const timer = window.setTimeout(() => flowRef.current?.fitView({ padding: 0.22, duration: 320 }), 40);
    return () => window.clearTimeout(timer);
  }, [derivedNodes.length, graph.activeSessionId, graph.view]);

  const flowEdges = useMemo<Edge[]>(() => graph.edges.map((row) => {
    const treatment = EDGE_STYLE[row.kind] ?? { color: "#8b8791", dash: "4 5" };
    const directional = row.kind === "link" || row.kind === "reply" || row.kind === "fork";
    return {
      id: row.id,
      source: row.sourceNodeId,
      target: row.targetNodeId,
      label: graph.edges.length <= 12 ? row.label ?? undefined : undefined,
      className: `explore-edge kind-${row.kind}`,
      style: {
        stroke: treatment.color,
        strokeWidth: row.accepted === 1 ? 2.2 : 1.65,
        strokeDasharray: treatment.dash,
      },
      markerEnd: directional ? {
        type: MarkerType.ArrowClosed,
        color: treatment.color,
        width: 16,
        height: 16,
        markerUnits: "userSpaceOnUse",
      } : undefined,
    };
  }), [graph.edges]);

  const handleNodesChange = useCallback((changes: NodeChange<ExploreFlowNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const candidateCounts = useMemo<Record<ExploreExpansionKind, number>>(() => ({
    direct: discovery.candidates.direct.length,
    similar: discovery.candidates.similar.length,
    curated: discovery.candidates.curated.length,
    temporal: discovery.candidates.temporal.length,
    mixed: discovery.candidates.mixed.length,
  }), [discovery.candidates]);

  return (
    <div className="explore-wrap">
      <ExplorePanel
        sessions={graph.sessions}
        activeSession={graph.activeSession}
        activeSessionId={graph.activeSessionId}
        focusNode={focusedNode}
        focusItem={focusedItem}
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        candidateCounts={candidateCounts}
        candidateReady={discovery.ready}
        status={status}
        onSelectSession={graph.setActiveSessionId}
        onCreateTrail={() => { void graph.createTrail(); setStatus("New local trail ready."); }}
        onRenameTrail={(title) => { void graph.renameTrail(title); }}
        onDeleteTrail={() => {
          if (!graph.activeSessionId || !window.confirm("Delete this local exploration trail?")) return;
          void graph.deleteTrail(graph.activeSessionId).then(() => setStatus("Local trail deleted."));
        }}
        onSeed={(item, query) => {
          void graph.seed(item, query).then(() => {
            setStatus(`${item.title} added to the trail.`);
            window.setTimeout(() => flowRef.current?.fitView({ padding: 0.22, duration: 380 }), 30);
          });
        }}
        onExpand={(kind) => { if (focusedNode) requestExpansion(focusedNode.id, kind); }}
        onTogglePinned={(id) => { void graph.togglePinned(id); }}
        onCollapse={(id) => {
          void graph.collapseBranch(id).then((removed) => setStatus(removed > 0
            ? `Collapsed ${removed} unpinned ${removed === 1 ? "node" : "nodes"}.`
            : "There is no unpinned branch to collapse."));
        }}
      />

      <section className="explore-canvas" aria-label="Exploration graph">
        <ReactFlow<ExploreFlowNode, Edge>
          key={graph.activeSessionId ?? "empty"}
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onNodeClick={(_event, node) => { void graph.focusNode(node.id); }}
          onNodeDragStop={(_event, node) => { void graph.moveNode(node.id, node.position.x, node.position.y); }}
          onMoveEnd={(_event, viewport) => { void graph.updateViewport(viewport); }}
          onInit={(instance) => { flowRef.current = instance; }}
          defaultViewport={{
            x: graph.view?.viewportX ?? 0,
            y: graph.view?.viewportY ?? 0,
            zoom: graph.view?.zoom ?? 1,
          }}
          nodesConnectable={false}
          nodesDraggable
          elementsSelectable
          zoomOnDoubleClick={false}
          fitView={!graph.view && flowNodes.length > 0}
          minZoom={0.18}
          maxZoom={2.2}
        >
          <Background gap={22} size={1} />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => {
              const kind = (node.data as ExploreFlowNode["data"]).item.kind;
              return kind === "thought" ? "#bd9559" : kind === "paste" ? "#4d9a83" : "#8d6ba8";
            }}
          />
          <div className="explore-legend" aria-hidden="true">
            <span><i className="kind-link" /> direct</span>
            <span><i className="kind-similar" /> similar</span>
            <span><i className="kind-curated" /> co-framed</span>
            <span><i className="kind-temporal" /> nearby</span>
          </div>
        </ReactFlow>
        {flowNodes.length === 0 ? (
          <div className="explore-empty-canvas">
            <span aria-hidden="true">✣</span>
            <h2>Begin anywhere.</h2>
            <p>Search on the left, then follow whatever catches.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
