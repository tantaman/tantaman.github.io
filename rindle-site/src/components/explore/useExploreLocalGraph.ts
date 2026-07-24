import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useRindleStore } from "@rindle/react";
import type { Viewport } from "@xyflow/react";
import { ulid } from "ulid";

import type {
  ExploreEdgeRow,
  ExploreNodeRow,
  ExploreSessionRow,
  ExploreViewRow,
} from "../../schema.local.ts";
import type { ExploreCandidate, ExploreItem, ExploreItemKind } from "./types.ts";

const EMPTY_SESSION = "\u0000explore-session";
const MAX_LOCAL_SESSIONS = 50;
const MAX_LOCAL_NODES = 200;
const MAX_LOCAL_EDGES = 1_000;

function nodeId(sessionId: string, kind: ExploreItemKind, itemId: string): string {
  return `explore-node:${sessionId}:${kind}:${encodeURIComponent(itemId)}`;
}

function edgeId(sessionId: string, sourceNodeId: string, targetNodeId: string, kind: string): string {
  return `explore-edge:${sessionId}:${encodeURIComponent(sourceNodeId)}:${encodeURIComponent(targetNodeId)}:${kind}`;
}

function defaultView(id: string): ExploreViewRow {
  return {
    id,
    focusedNodeId: null,
    selectedNodeId: null,
    viewportX: 0,
    viewportY: 0,
    zoom: 1,
  };
}

function shortTitle(value: string): string {
  const clean = value.replace(/\s+/gu, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 47).trim()}…` : clean || "Untitled trail";
}

export function useExploreLocalGraph() {
  const store = useRindleStore();
  const sessionsQuery = useMemo(
    () => store.query.exploreSession.orderBy("updatedAt", "desc").orderBy("id", "asc").limit(MAX_LOCAL_SESSIONS),
    [store],
  );
  const sessions = useQuery(sessionsQuery) as readonly ExploreSessionRow[];
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSessionId && sessions.some((session) => session.id === activeSessionId)) return;
    setActiveSessionId(sessions[0]?.id ?? null);
  }, [activeSessionId, sessions]);

  const scopedSession = activeSessionId ?? EMPTY_SESSION;
  const nodesQuery = useMemo(
    () => store.query.exploreNode
      .where.sessionId(scopedSession)
      .orderBy("addedAt", "asc")
      .orderBy("id", "asc")
      .limit(MAX_LOCAL_NODES),
    [scopedSession, store],
  );
  const edgesQuery = useMemo(
    () => store.query.exploreEdge
      .where.sessionId(scopedSession)
      .orderBy("addedAt", "asc")
      .orderBy("id", "asc")
      .limit(MAX_LOCAL_EDGES),
    [scopedSession, store],
  );
  const viewQuery = useMemo(
    () => store.query.exploreView.where.id(scopedSession).one(),
    [scopedSession, store],
  );
  const nodes = useQuery(nodesQuery) as readonly ExploreNodeRow[];
  const edges = useQuery(edgesQuery) as readonly ExploreEdgeRow[];
  const view = useQuery(viewQuery) as ExploreViewRow | null;
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;

  const sessionsRef = useRef(sessions);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewRef = useRef(view);
  sessionsRef.current = sessions;
  nodesRef.current = nodes;
  edgesRef.current = edges;
  viewRef.current = view;

  const writeView = useCallback(async (sessionId: string, patch: Partial<ExploreViewRow>) => {
    const current = viewRef.current?.id === sessionId ? viewRef.current : null;
    const next = { ...(current ?? defaultView(sessionId)), ...patch, id: sessionId };
    viewRef.current = next;
    await store.writeLocal((tx) => {
      if (current) tx.edit("exploreView", current, next);
      else tx.add("exploreView", next);
    });
  }, [store]);

  const createTrail = useCallback(async (title = "Untitled trail"): Promise<string> => {
    const now = Date.now();
    const id = ulid(now);
    const session: ExploreSessionRow = {
      id,
      title: shortTitle(title),
      seedKind: null,
      seedItemId: null,
      seedQuery: null,
      createdAt: now,
      updatedAt: now,
    };
    const nextView = defaultView(id);
    await store.writeLocal((tx) => {
      tx.add("exploreSession", session);
      tx.add("exploreView", nextView);
    });
    sessionsRef.current = [session, ...sessionsRef.current];
    viewRef.current = nextView;
    setActiveSessionId(id);
    return id;
  }, [store]);

  const renameTrail = useCallback(async (title: string) => {
    const session = sessionsRef.current.find((row) => row.id === activeSessionId);
    if (!session) return;
    const next = { ...session, title: shortTitle(title), updatedAt: Date.now() };
    await store.writeLocal((tx) => tx.edit("exploreSession", session, next));
    sessionsRef.current = sessionsRef.current.map((row) => row.id === next.id ? next : row);
  }, [activeSessionId, store]);

  const deleteTrail = useCallback(async (id: string) => {
    const session = sessionsRef.current.find((row) => row.id === id);
    if (!session) return;
    const sessionNodes = nodesRef.current.filter((row) => row.sessionId === id);
    const sessionEdges = edgesRef.current.filter((row) => row.sessionId === id);
    const sessionView = viewRef.current?.id === id ? viewRef.current : null;
    await store.writeLocal((tx) => {
      for (const edge of sessionEdges) tx.remove("exploreEdge", edge);
      for (const node of sessionNodes) tx.remove("exploreNode", node);
      if (sessionView) tx.remove("exploreView", sessionView);
      tx.remove("exploreSession", session);
    });
    sessionsRef.current = sessionsRef.current.filter((row) => row.id !== id);
    nodesRef.current = nodesRef.current.filter((row) => row.sessionId !== id);
    edgesRef.current = edgesRef.current.filter((row) => row.sessionId !== id);
    if (viewRef.current?.id === id) viewRef.current = null;
    if (activeSessionId === id) setActiveSessionId(null);
  }, [activeSessionId, store]);

  const seed = useCallback(async (item: ExploreItem, query: string) => {
    let sessionId = activeSessionId;
    let session = sessionsRef.current.find((row) => row.id === sessionId);
    if (!sessionId || !session) {
      sessionId = await createTrail(item.title);
      session = sessionsRef.current.find((row) => row.id === sessionId);
    }

    const existing = nodesRef.current.find((row) => row.sessionId === sessionId && row.itemKind === item.kind && row.itemId === item.id);
    if (existing) {
      await writeView(sessionId, { focusedNodeId: existing.id, selectedNodeId: existing.id });
      return existing.id;
    }

    const now = Date.now();
    const id = nodeId(sessionId, item.kind, item.id);
    const index = nodesRef.current.filter((row) => row.sessionId === sessionId).length;
    const node: ExploreNodeRow = {
      id,
      sessionId,
      itemKind: item.kind,
      itemId: item.id,
      x: index === 0 ? 0 : 320 + ((index - 1) % 3) * 290,
      y: index === 0 ? 0 : (Math.floor((index - 1) / 3) - 1) * 190,
      pinned: 1,
      parentNodeId: null,
      discoveredBy: index === 0 ? "seed" : "search",
      addedAt: now,
    };
    const currentSession = sessionsRef.current.find((row) => row.id === sessionId);
    const nextSession = currentSession ? {
      ...currentSession,
      title: index === 0 ? shortTitle(item.title) : currentSession.title,
      seedKind: index === 0 ? item.kind : currentSession.seedKind,
      seedItemId: index === 0 ? item.id : currentSession.seedItemId,
      seedQuery: index === 0 ? query || null : currentSession.seedQuery,
      updatedAt: now,
    } : null;
    const currentView = viewRef.current?.id === sessionId ? viewRef.current : null;
    const nextView = {
      ...(currentView ?? defaultView(sessionId)),
      focusedNodeId: id,
      selectedNodeId: id,
    };
    await store.writeLocal((tx) => {
      tx.add("exploreNode", node);
      if (currentSession && nextSession) tx.edit("exploreSession", currentSession, nextSession);
      if (currentView) tx.edit("exploreView", currentView, nextView);
      else tx.add("exploreView", nextView);
    });
    nodesRef.current = [...nodesRef.current, node];
    if (currentSession && nextSession) {
      sessionsRef.current = sessionsRef.current.map((row) => row.id === nextSession.id ? nextSession : row);
    }
    viewRef.current = nextView;
    return id;
  }, [activeSessionId, createTrail, store, writeView]);

  const addCandidates = useCallback(async (parent: ExploreNodeRow, candidates: readonly ExploreCandidate[]) => {
    if (!activeSessionId || parent.sessionId !== activeSessionId) return 0;
    const currentNodes = nodesRef.current.filter((row) => row.sessionId === activeSessionId);
    const currentEdges = edgesRef.current.filter((row) => row.sessionId === activeSessionId);
    const existingByItem = new Map(currentNodes.map((row) => [`${row.itemKind}:${row.itemId}`, row]));
    const existingEdgeIds = new Set(currentEdges.map((row) => row.id));
    const additions: ExploreNodeRow[] = [];
    const edgeAdditions: ExploreEdgeRow[] = [];
    const now = Date.now();
    const unique = new Set<string>();
    const usable = candidates.filter((candidate) => {
      const key = `${candidate.itemKind}:${candidate.itemId}`;
      if (key === `${parent.itemKind}:${parent.itemId}` || unique.has(key)) return false;
      unique.add(key);
      return true;
    }).slice(0, Math.min(10, MAX_LOCAL_NODES - currentNodes.length));

    usable.forEach((candidate, index) => {
      const key = `${candidate.itemKind}:${candidate.itemId}`;
      let child = existingByItem.get(key);
      if (!child) {
        const angle = usable.length === 1
          ? 0
          : (-Math.PI * 0.7) + (index / (usable.length - 1)) * Math.PI * 1.4;
        const radius = 360 + (index % 2) * 55;
        child = {
          id: nodeId(activeSessionId, candidate.itemKind, candidate.itemId),
          sessionId: activeSessionId,
          itemKind: candidate.itemKind,
          itemId: candidate.itemId,
          x: parent.x + Math.cos(angle) * radius,
          y: parent.y + Math.sin(angle) * radius,
          pinned: 0,
          parentNodeId: parent.id,
          discoveredBy: candidate.kind,
          addedAt: now + index,
        };
        existingByItem.set(key, child);
        additions.push(child);
      }
      const sourceNodeId = candidate.direction === "inbound" ? child.id : parent.id;
      const targetNodeId = candidate.direction === "inbound" ? parent.id : child.id;
      const id = edgeId(activeSessionId, sourceNodeId, targetNodeId, candidate.kind);
      if (!existingEdgeIds.has(id)) {
        existingEdgeIds.add(id);
        edgeAdditions.push({
          id,
          sessionId: activeSessionId,
          sourceNodeId,
          targetNodeId,
          kind: candidate.kind,
          label: candidate.label,
          score: candidate.score,
          evidence: candidate.evidence,
          projectionVersion: candidate.projectionVersion,
          accepted: 0,
          addedAt: now + index,
        });
      }
    });

    if (additions.length === 0 && edgeAdditions.length === 0) return 0;
    const session = sessionsRef.current.find((row) => row.id === activeSessionId);
    const nextSession = session ? { ...session, updatedAt: now } : null;
    await store.writeLocal((tx) => {
      for (const node of additions) tx.add("exploreNode", node);
      for (const edge of edgeAdditions) tx.add("exploreEdge", edge);
      if (session && nextSession) tx.edit("exploreSession", session, nextSession);
    });
    nodesRef.current = [...nodesRef.current, ...additions];
    edgesRef.current = [...edgesRef.current, ...edgeAdditions];
    if (session && nextSession) {
      sessionsRef.current = sessionsRef.current.map((row) => row.id === nextSession.id ? nextSession : row);
    }
    await writeView(activeSessionId, { focusedNodeId: parent.id, selectedNodeId: parent.id });
    return additions.length;
  }, [activeSessionId, store, writeView]);

  const togglePinned = useCallback(async (id: string) => {
    const current = nodesRef.current.find((row) => row.id === id);
    if (!current) return;
    const next = { ...current, pinned: current.pinned === 1 ? 0 : 1 };
    await store.writeLocal((tx) => tx.edit("exploreNode", current, next));
    nodesRef.current = nodesRef.current.map((row) => row.id === next.id ? next : row);
  }, [store]);

  const moveNode = useCallback(async (id: string, x: number, y: number) => {
    const current = nodesRef.current.find((row) => row.id === id);
    if (!current || (current.x === x && current.y === y)) return;
    const next = { ...current, x, y };
    await store.writeLocal((tx) => tx.edit("exploreNode", current, next));
    nodesRef.current = nodesRef.current.map((row) => row.id === next.id ? next : row);
  }, [store]);

  const collapseBranch = useCallback(async (rootId: string) => {
    const currentNodes = nodesRef.current;
    const removeIds = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      for (const child of currentNodes) {
        if (child.parentNodeId !== parentId || child.pinned === 1 || removeIds.has(child.id)) continue;
        removeIds.add(child.id);
        queue.push(child.id);
      }
    }
    if (removeIds.size === 0) return 0;
    const removedNodes = currentNodes.filter((row) => removeIds.has(row.id));
    const removedEdges = edgesRef.current.filter((row) => removeIds.has(row.sourceNodeId) || removeIds.has(row.targetNodeId));
    await store.writeLocal((tx) => {
      for (const edge of removedEdges) tx.remove("exploreEdge", edge);
      for (const node of removedNodes) tx.remove("exploreNode", node);
    });
    nodesRef.current = nodesRef.current.filter((row) => !removeIds.has(row.id));
    const removedEdgeIds = new Set(removedEdges.map((row) => row.id));
    edgesRef.current = edgesRef.current.filter((row) => !removedEdgeIds.has(row.id));
    return removedNodes.length;
  }, [store]);

  const focusNode = useCallback(async (id: string | null) => {
    if (!activeSessionId) return;
    await writeView(activeSessionId, { focusedNodeId: id, selectedNodeId: id });
  }, [activeSessionId, writeView]);

  const updateViewport = useCallback(async (viewport: Viewport) => {
    if (!activeSessionId) return;
    await writeView(activeSessionId, {
      viewportX: viewport.x,
      viewportY: viewport.y,
      zoom: viewport.zoom,
    });
  }, [activeSessionId, writeView]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    nodes,
    edges,
    view,
    createTrail,
    renameTrail,
    deleteTrail,
    seed,
    addCandidates,
    togglePinned,
    moveNode,
    collapseBranch,
    focusNode,
    updateViewport,
  };
}
