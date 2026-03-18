import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../App';
import { useThoughtGraph } from '../hooks/useCache';
import { projectEmbeddings, type ProjectedPoint } from '../umap';
import type { Thought } from '../types';

const PADDING = 60;
const NODE_MIN_R = 5;
const NODE_MAX_R = 18;
const DEFAULT_COLOR = '#888';

interface NodeData extends ProjectedPoint {
  thought: Thought;
  r: number;
  screenX: number;
  screenY: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ThoughtGraph() {
  const { secret } = useContext(AuthContext);
  const { data, isLoading } = useThoughtGraph(secret);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [showEdges, setShowEdges] = useState(false);
  const [threshold, setThreshold] = useState(0.82);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  // Camera state
  const cameraRef = useRef({ offsetX: 0, offsetY: 0, zoom: 1 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const projected = useMemo(() => {
    if (!data || data.thoughts.length === 0) return [];
    const ids = data.thoughts.map((t) => t.id);
    return projectEmbeddings(ids, data.embeddings);
  }, [data]);

  const nodes: NodeData[] = useMemo(() => {
    if (!data || projected.length === 0) return [];
    const thoughtMap = new Map(data.thoughts.map((t) => [t.id, t]));
    const maxReplies = Math.max(1, ...data.thoughts.map((t) => t.reply_count));

    return projected.map((p) => {
      const thought = thoughtMap.get(p.id)!;
      const t = thought.reply_count / maxReplies;
      const r = NODE_MIN_R + t * (NODE_MAX_R - NODE_MIN_R);
      return { ...p, thought, r, screenX: 0, screenY: 0 };
    });
  }, [data, projected]);

  const visibleIds = useMemo(() => {
    if (!selectedNode || !data) return null;
    const set = new Set<number>([selectedNode.thought.id]);
    if (showEdges) {
      const selVec = data.embeddings[String(selectedNode.thought.id)];
      if (selVec) {
        for (const node of nodes) {
          const vec = data.embeddings[String(node.thought.id)];
          if (vec && cosineSimilarity(selVec, vec) >= threshold) {
            set.add(node.thought.id);
          }
        }
      }
    }
    return set;
  }, [selectedNode, data, nodes, threshold, showEdges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const cam = cameraRef.current;
    const plotW = w - PADDING * 2;
    const plotH = h - PADDING * 2;

    // Compute screen positions
    for (const node of nodes) {
      node.screenX = PADDING + node.x * plotW;
      node.screenY = PADDING + node.y * plotH;

      // Apply camera
      node.screenX = (node.screenX - w / 2) * cam.zoom + w / 2 + cam.offsetX;
      node.screenY = (node.screenY - h / 2) * cam.zoom + h / 2 + cam.offsetY;
    }

    // Draw edges
    if (showEdges && data) {
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        if (visibleIds && !visibleIds.has(nodes[i].thought.id)) continue;
        const vecA = data.embeddings[String(nodes[i].thought.id)];
        if (!vecA) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          if (visibleIds && !visibleIds.has(nodes[j].thought.id)) continue;
          const vecB = data.embeddings[String(nodes[j].thought.id)];
          if (!vecB) continue;
          const sim = cosineSimilarity(vecA, vecB);
          if (sim >= threshold) {
            const alpha = Math.min(1, (sim - threshold) / (1 - threshold) * 0.6 + 0.1);
            ctx.strokeStyle = `rgba(150, 150, 150, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].screenX, nodes[i].screenY);
            ctx.lineTo(nodes[j].screenX, nodes[j].screenY);
            ctx.stroke();
          }
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      if (visibleIds && !visibleIds.has(node.thought.id)) continue;
      ctx.beginPath();
      ctx.arc(node.screenX, node.screenY, node.r * cam.zoom, 0, Math.PI * 2);
      ctx.fillStyle = node.thought.color || DEFAULT_COLOR;
      ctx.globalAlpha = hoveredNode && hoveredNode.id !== node.id ? 0.4 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [nodes, showEdges, threshold, data, hoveredNode, visibleIds]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => draw();
    const observer = new ResizeObserver(onResize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const hitTest = useCallback((clientX: number, clientY: number): NodeData | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const cam = cameraRef.current;

    let closest: NodeData | null = null;
    let closestDist = Infinity;

    for (const node of nodes) {
      if (visibleIds && !visibleIds.has(node.thought.id)) continue;
      const dx = mx - node.screenX;
      const dy = my - node.screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = Math.max(node.r * cam.zoom, 8);
      if (dist < hitRadius && dist < closestDist) {
        closest = node;
        closestDist = dist;
      }
    }
    return closest;
  }, [nodes, visibleIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      cameraRef.current.offsetX += dx;
      cameraRef.current.offsetY += dy;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setHoveredNode(null);
      draw();
      return;
    }

    const node = hitTest(e.clientX, e.clientY);
    setHoveredNode(node);

    if (node && tooltipRef.current) {
      const rect = wrapRef.current!.getBoundingClientRect();
      const tx = node.screenX;
      const ty = node.screenY - node.r * cameraRef.current.zoom - 10;
      tooltipRef.current.style.left = `${tx}px`;
      tooltipRef.current.style.top = `${ty}px`;
    }
  }, [hitTest, draw]);

  // Attach wheel listener imperatively to get { passive: false }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const cam = cameraRef.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(10, cam.zoom * factor));

      cam.offsetX = mx - (mx - cam.offsetX) * (newZoom / cam.zoom);
      cam.offsetY = my - (my - cam.offsetY) * (newZoom / cam.zoom);
      cam.zoom = newZoom;

      draw();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    // If barely moved, treat as click
    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    if (dx < 3 && dy < 3) {
      const node = hitTest(e.clientX, e.clientY);
      if (node && selectedNode && node.thought.id === selectedNode.thought.id) {
        setSelectedNode(null);
      } else if (node) {
        setSelectedNode(node);
      } else {
        setSelectedNode(null);
      }
    }
  }, [hitTest, selectedNode]);

  if (isLoading) {
    return <div className="thought-graph-wrap"><p style={{ padding: 20, opacity: 0.5 }}>Loading graph...</p></div>;
  }

  if (!data || data.thoughts.length === 0) {
    return <div className="thought-graph-wrap"><p style={{ padding: 20, opacity: 0.5 }}>No thoughts to display.</p></div>;
  }

  return (
    <div className="thought-graph-wrap" ref={wrapRef}>
      <div className="thought-graph-controls">
        <a href="/thoughts/" className="thoughts-nav-link" onClick={(e) => {
          e.preventDefault();
          history.pushState(null, '', '/thoughts/');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }}>← Back</a>
        <label className="thought-graph-toggle">
          <input type="checkbox" checked={showEdges} onChange={(e) => setShowEdges(e.target.checked)} />
          Edges
        </label>
        {showEdges && (
          <label className="thought-graph-slider-label">
            <input
              type="range"
              min="0.5"
              max="0.98"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="thought-graph-slider"
            />
            {threshold.toFixed(2)}
          </label>
        )}
      </div>

      <canvas
        ref={canvasRef}
        className="thought-graph-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { draggingRef.current = false; setHoveredNode(null); }}
      />

      {hoveredNode && (
        <div className="thought-graph-tooltip" ref={tooltipRef}>
          <div className="thought-graph-tooltip-body">{truncate(hoveredNode.thought.body, 200)}</div>
          <div className="thought-graph-tooltip-meta">
            {formatDate(hoveredNode.thought.timestamp)}
            {hoveredNode.thought.reply_count > 0 && ` · ${hoveredNode.thought.reply_count} replies`}
          </div>
        </div>
      )}
    </div>
  );
}
