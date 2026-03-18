import type { Thought } from './types';

export interface ClusterInfo {
  id: number;
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
  nodeIds: Set<number>;
  color: string;
}

interface Point {
  id: number;
  x: number;
  y: number;
}

// --- DBSCAN ---

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function regionQuery(points: Point[], p: Point, eps: number): number[] {
  const neighbors: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (dist(p, points[i]) <= eps) neighbors.push(i);
  }
  return neighbors;
}

/**
 * DBSCAN clustering on 2D points.
 * Returns Map<pointId, clusterId>. Noise points are omitted.
 */
function dbscan(
  points: Point[],
  epsilon: number,
  minPts: number,
): Map<number, number> {
  const labels = new Int32Array(points.length).fill(-1); // -1 = unvisited
  const NOISE = -2;
  let clusterId = 0;

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== -1) continue;
    const neighbors = regionQuery(points, points[i], epsilon);
    if (neighbors.length < minPts) {
      labels[i] = NOISE;
      continue;
    }
    labels[i] = clusterId;
    const seed = new Set(neighbors);
    seed.delete(i);
    const queue = [...seed];
    while (queue.length > 0) {
      const j = queue.pop()!;
      if (labels[j] === NOISE) {
        labels[j] = clusterId;
      }
      if (labels[j] !== -1) continue;
      labels[j] = clusterId;
      const jNeighbors = regionQuery(points, points[j], epsilon);
      if (jNeighbors.length >= minPts) {
        for (const n of jNeighbors) {
          if (!seed.has(n)) {
            seed.add(n);
            queue.push(n);
          }
        }
      }
    }
    clusterId++;
  }

  const result = new Map<number, number>();
  for (let i = 0; i < points.length; i++) {
    if (labels[i] >= 0) result.set(points[i].id, labels[i]);
  }
  return result;
}

/**
 * Auto-compute epsilon as the median of k-nearest-neighbor distances.
 */
function autoEpsilon(points: Point[], k: number): number {
  const kDists: number[] = [];
  for (const p of points) {
    const dists: number[] = [];
    for (const q of points) {
      if (p.id === q.id) continue;
      dists.push(dist(p, q));
    }
    dists.sort((a, b) => a - b);
    if (dists.length >= k) kDists.push(dists[k - 1]);
  }
  kDists.sort((a, b) => a - b);
  return kDists[Math.floor(kDists.length / 2)] || 0.1;
}

// --- Cluster naming ---

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
  'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'are', 'was', 'been', 'has', 'had',
  'did', 'were', 'more', 'being', 'been', 'very', 'much', 'don',
  'doesn', 'isn', 'http', 'https', 'www', 'com',
]);

// Structured tag prefixes to skip
const STRUCTURED_TAGS = new Set(['t', 'e', 'l', 'm', 'b', 'q']);

function extractHashtags(body: string): string[] {
  const tags: string[] = [];
  const re = /#(\w+)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const tag = match[1].toLowerCase();
    if (!STRUCTURED_TAGS.has(tag) && tag.length > 1) {
      tags.push(tag);
    }
  }
  return tags;
}

function tokenize(body: string): string[] {
  // Strip markdown links, URLs, code blocks
  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .toLowerCase();
  return cleaned
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function nameCluster(
  bodies: string[],
  allClusterBodies: string[][],
): string {
  // Try hashtag-based naming first
  const tagCounts = new Map<string, number>();
  let thoughtsWithTags = 0;
  for (const body of bodies) {
    const tags = extractHashtags(body);
    if (tags.length > 0) thoughtsWithTags++;
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  if (thoughtsWithTags >= 3 && tagCounts.size > 0) {
    // TF-ICF on hashtags
    const totalTags = [...tagCounts.values()].reduce((a, b) => a + b, 0);
    // Compute inverse cluster frequency
    const tagClusterFreq = new Map<string, number>();
    for (const clusterBodies of allClusterBodies) {
      const clusterTags = new Set<string>();
      for (const b of clusterBodies) {
        for (const tag of extractHashtags(b)) clusterTags.add(tag);
      }
      for (const tag of clusterTags) {
        tagClusterFreq.set(tag, (tagClusterFreq.get(tag) || 0) + 1);
      }
    }
    const totalClusters = allClusterBodies.length;
    const scored: [string, number][] = [];
    for (const [tag, count] of tagCounts) {
      const tf = count / totalTags;
      const icf = Math.log((totalClusters + 1) / ((tagClusterFreq.get(tag) || 0) + 1)) + 1;
      scored.push([tag, tf * icf]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    if (scored.length === 1 || scored[0][1] > 3 * (scored[1]?.[1] ?? 0)) {
      return capitalize(scored[0][0]);
    }
    return scored.slice(0, 2).map(([t]) => capitalize(t)).join(' & ');
  }

  // Fallback: body text TF-IDF
  const termCounts = new Map<string, number>();
  for (const body of bodies) {
    for (const term of tokenize(body)) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
  }

  // Document frequency across clusters
  const df = new Map<string, number>();
  for (const clusterBodies of allClusterBodies) {
    const clusterTerms = new Set<string>();
    for (const b of clusterBodies) {
      for (const term of tokenize(b)) clusterTerms.add(term);
    }
    for (const term of clusterTerms) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const totalTerms = [...termCounts.values()].reduce((a, b) => a + b, 0);
  if (totalTerms === 0) return 'Cluster';

  const totalDocs = allClusterBodies.length;
  const scored: [string, number][] = [];
  for (const [term, count] of termCounts) {
    if (term.length < 4) continue;
    const tf = count / totalTerms;
    const idf = Math.log((totalDocs + 1) / ((df.get(term) || 0) + 1)) + 1;
    scored.push([term, tf * idf]);
  }
  scored.sort((a, b) => b[1] - a[1]);

  const topTerms = scored.slice(0, 2).map(([t]) => capitalize(t));
  return topTerms.length > 0 ? topTerms.join(' & ') : 'Cluster';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Main entry point ---

interface NodeInput {
  id: number;
  x: number;
  y: number;
  thought: Thought;
}

// Palette for cluster colors (used as fallback if thoughts lack colors)
const PALETTE = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#a855f7',
];

export function computeClusters(nodes: NodeInput[]): ClusterInfo[] {
  if (nodes.length < 6) return [];

  const points: Point[] = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
  const eps = autoEpsilon(points, 4);
  const assignments = dbscan(points, eps, 3);

  // Group by cluster
  const groups = new Map<number, NodeInput[]>();
  for (const node of nodes) {
    const cid = assignments.get(node.id);
    if (cid == null) continue;
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid)!.push(node);
  }

  // Filter out tiny clusters
  for (const [cid, members] of groups) {
    if (members.length < 3) groups.delete(cid);
  }

  if (groups.size === 0) return [];

  // Prepare bodies for naming
  const allClusterBodies = [...groups.values()].map((members) =>
    members.map((n) => n.thought.body),
  );

  const clusters: ClusterInfo[] = [];
  let idx = 0;
  for (const [cid, members] of groups) {
    const bodies = members.map((n) => n.thought.body);
    const name = nameCluster(bodies, allClusterBodies);

    // Centroid
    let cx = 0, cy = 0;
    for (const m of members) {
      cx += m.x;
      cy += m.y;
    }
    cx /= members.length;
    cy /= members.length;

    // Radius = max distance from centroid + padding
    let maxDist = 0;
    for (const m of members) {
      const d = Math.sqrt((m.x - cx) ** 2 + (m.y - cy) ** 2);
      if (d > maxDist) maxDist = d;
    }

    // Average color from member thoughts
    let r = 0, g = 0, b = 0, colorCount = 0;
    for (const m of members) {
      const c = m.thought.color;
      if (c && c.startsWith('#') && c.length >= 7) {
        r += parseInt(c.slice(1, 3), 16);
        g += parseInt(c.slice(3, 5), 16);
        b += parseInt(c.slice(5, 7), 16);
        colorCount++;
      }
    }
    const color = colorCount > 0
      ? `#${Math.round(r / colorCount).toString(16).padStart(2, '0')}${Math.round(g / colorCount).toString(16).padStart(2, '0')}${Math.round(b / colorCount).toString(16).padStart(2, '0')}`
      : PALETTE[idx % PALETTE.length];

    clusters.push({
      id: cid,
      name,
      centerX: cx,
      centerY: cy,
      radius: maxDist + 0.02, // padding in normalized coords
      nodeIds: new Set(members.map((m) => m.id)),
      color,
    });
    idx++;
  }

  return clusters;
}
