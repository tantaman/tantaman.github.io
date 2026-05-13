import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AuthContext } from '../App';
import { useThoughtGraph } from '../hooks/useCache';
import type { GraphThought } from '../types';

const PADDING = 60;
const NODE_MIN_R = 5;
const NODE_MAX_R = 18;
const DEFAULT_COLOR = '#888';

interface NodeData {
  id: number;
  x: number;
  y: number;
  cluster_id: number | null;
  thought: GraphThought;
  r: number;
  screenX: number;
  screenY: number;
}

interface ClusterCircle {
  id: number;
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
  color: string;
  nodeIds: Set<number>;
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

function averageHex(colors: string[]): string {
  if (colors.length === 0) return DEFAULT_COLOR;
  let r = 0, g = 0, b = 0, count = 0;
  for (const c of colors) {
    if (!c || c.length !== 7 || c[0] !== '#') continue;
    r += parseInt(c.slice(1, 3), 16);
    g += parseInt(c.slice(3, 5), 16);
    b += parseInt(c.slice(5, 7), 16);
    count++;
  }
  if (count === 0) return DEFAULT_COLOR;
  const toHex = (n: number) => Math.round(n / count).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function ThoughtGraph() {
  const { secret } = useContext(AuthContext);
  const { data, isLoading } = useThoughtGraph(secret);
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [showClusters, setShowClusters] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  const cameraRef = useRef({ offsetX: 0, offsetY: 0, zoom: 1 });
  const draggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const nodes: NodeData[] = useMemo(() => {
    if (!data || data.thoughts.length === 0) return [];
    const maxReplies = Math.max(1, ...data.thoughts.map((t) => t.reply_count));

    return data.thoughts.map((t) => {
      const ratio = t.reply_count / maxReplies;
      const r = NODE_MIN_R + ratio * (NODE_MAX_R - NODE_MIN_R);
      return {
        id: t.id,
        x: t.x ?? 0.5,
        y: t.y ?? 0.5,
        cluster_id: t.cluster_id,
        thought: t,
        r,
        screenX: 0,
        screenY: 0,
      };
    });
  }, [data]);

  const clusters: ClusterCircle[] = useMemo(() => {
    if (!data || nodes.length === 0) return [];

    const byCluster = new Map<number, NodeData[]>();
    for (const n of nodes) {
      if (n.cluster_id == null) continue;
      let list = byCluster.get(n.cluster_id);
      if (!list) { list = []; byCluster.set(n.cluster_id, list); }
      list.push(n);
    }

    const out: ClusterCircle[] = [];
    for (const c of data.clusters) {
      const members = byCluster.get(c.id);
      if (!members || members.length === 0) continue;
      let sx = 0, sy = 0;
      for (const n of members) { sx += n.x; sy += n.y; }
      const cx = sx / members.length;
      const cy = sy / members.length;
      let maxD = 0;
      for (const n of members) {
        const dx = n.x - cx, dy = n.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxD) maxD = d;
      }
      out.push({
        id: c.id,
        name: c.label,
        centerX: cx,
        centerY: cy,
        radius: Math.max(0.015, maxD + 0.01),
        color: averageHex(members.map((m) => m.thought.color ?? '')),
        nodeIds: new Set(members.map((m) => m.id)),
      });
    }
    return out;
  }, [data, nodes]);

  const visibleIds = useMemo(() => {
    if (selectedCluster == null) return null;
    const cluster = clusters.find((c) => c.id === selectedCluster);
    return cluster ? cluster.nodeIds : null;
  }, [selectedCluster, clusters]);

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

    for (const node of nodes) {
      const plotX = PADDING + node.x * plotW;
      const plotY = PADDING + node.y * plotH;
      node.screenX = (plotX - w / 2) * cam.zoom + w / 2 + cam.offsetX;
      node.screenY = (plotY - h / 2) * cam.zoom + h / 2 + cam.offsetY;
    }

    if (showClusters && clusters.length > 0) {
      for (const cluster of clusters) {
        if (visibleIds && !cluster.nodeIds.has([...visibleIds][0])) {
          // Selected-cluster filter: only draw the active cluster.
          if (cluster.id !== selectedCluster) continue;
        }

        const scrCX = (PADDING + cluster.centerX * plotW - w / 2) * cam.zoom + w / 2 + cam.offsetX;
        const scrCY = (PADDING + cluster.centerY * plotH - h / 2) * cam.zoom + h / 2 + cam.offsetY;
        const scrR = cluster.radius * Math.max(plotW, plotH) * cam.zoom;

        const hex = cluster.color;
        const cr = parseInt(hex.slice(1, 3), 16);
        const cg = parseInt(hex.slice(3, 5), 16);
        const cb = parseInt(hex.slice(5, 7), 16);

        ctx.beginPath();
        ctx.arc(scrCX, scrCY, scrR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${cluster.id === selectedCluster ? 0.18 : 0.08})`;
        ctx.fill();

        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${cluster.id === selectedCluster ? 0.6 : 0.3})`;
        ctx.lineWidth = cluster.id === selectedCluster ? 2 : 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        const fontSize = Math.max(10, Math.min(16, 13 * cam.zoom));
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, 0.8)`;
        ctx.fillText(cluster.name, scrCX, scrCY - scrR - 4);
      }
    }

    for (const node of nodes) {
      if (visibleIds && !visibleIds.has(node.id)) continue;
      ctx.beginPath();
      ctx.arc(node.screenX, node.screenY, node.r * cam.zoom, 0, Math.PI * 2);
      ctx.fillStyle = node.thought.color || DEFAULT_COLOR;
      ctx.globalAlpha = hoveredNode && hoveredNode.id !== node.id ? 0.4 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [nodes, showClusters, clusters, hoveredNode, visibleIds, selectedCluster]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw());
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
      if (visibleIds && !visibleIds.has(node.id)) continue;
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

  const hitTestCluster = useCallback((clientX: number, clientY: number): ClusterCircle | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const cam = cameraRef.current;
    const w = rect.width;
    const h = rect.height;
    const plotW = w - PADDING * 2;
    const plotH = h - PADDING * 2;

    for (const cluster of clusters) {
      const scrCX = (PADDING + cluster.centerX * plotW - w / 2) * cam.zoom + w / 2 + cam.offsetX;
      const scrCY = (PADDING + cluster.centerY * plotH - h / 2) * cam.zoom + h / 2 + cam.offsetY;
      const scrR = cluster.radius * Math.max(plotW, plotH) * cam.zoom;
      const dx = mx - scrCX;
      const dy = my - scrCY;
      if (dx * dx + dy * dy <= scrR * scrR) return cluster;
    }
    return null;
  }, [clusters]);

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
      const tx = node.screenX;
      const ty = node.screenY - node.r * cameraRef.current.zoom - 10;
      tooltipRef.current.style.left = `${tx}px`;
      tooltipRef.current.style.top = `${ty}px`;
    }
  }, [hitTest, draw]);

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

    const dx = Math.abs(e.clientX - dragStartRef.current.x);
    const dy = Math.abs(e.clientY - dragStartRef.current.y);
    if (dx < 3 && dy < 3) {
      const node = hitTest(e.clientX, e.clientY);
      if (node) {
        navigate({ to: '/t/$id', params: { id: String(node.thought.id) } });
        return;
      }
      const cluster = hitTestCluster(e.clientX, e.clientY);
      if (cluster) {
        setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id);
        return;
      }
      setSelectedCluster(null);
    }
  }, [hitTest, hitTestCluster, selectedCluster, navigate]);

  if (isLoading) {
    return <div className="thought-graph-wrap"><p style={{ padding: 20, opacity: 0.5 }}>Loading graph…</p></div>;
  }

  if (!data || data.thoughts.length === 0) {
    return <div className="thought-graph-wrap"><p style={{ padding: 20, opacity: 0.5 }}>No thoughts to display.</p></div>;
  }

  const missingPositions = data.thoughts.some((t) => t.x == null);

  return (
    <div className="thought-graph-wrap" ref={wrapRef}>
      <div className="thought-graph-controls">
        <a href="/thoughts/" className="thoughts-nav-link" onClick={(e) => {
          e.preventDefault();
          history.pushState(null, '', '/thoughts/');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }}>← Back</a>
        <label className="thought-graph-toggle">
          <input type="checkbox" checked={showClusters} onChange={(e) => setShowClusters(e.target.checked)} />
          Clusters
        </label>
        {selectedCluster != null && (
          <button className="thought-graph-toggle" onClick={() => setSelectedCluster(null)}>
            Clear filter
          </button>
        )}
        {missingPositions && (
          <span style={{ fontSize: 12, opacity: 0.6 }}>Some items have no position — run <code>pnpm clusters --positions-only</code></span>
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
