/**
 * Cluster detection for relationship graph using Louvain community detection
 */
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import type { RelationshipEdge, ClusterMeta, ContentNode } from './types.js';
import { extractTerms, stem, STOP_WORDS } from './signals/text.js';

export interface ClusterResult {
  nodeCluster: Record<string, number>; // nodeId -> clusterId
  clusterMeta: ClusterMeta[];
  modularity: number;
}

/**
 * Build a KNN graph from the full edge list.
 * For each node, keep only its top-K neighbors by score, then symmetrize (OR).
 * If useSNN, replace edge weights with shared-nearest-neighbor Jaccard overlap.
 */
export function buildKNNEdges(
  allEdges: RelationshipEdge[],
  nodeIds: string[],
  k: number,
  useSNN: boolean
): RelationshipEdge[] {
  // Build adjacency: node -> sorted neighbors (descending by score)
  const adj = new Map<string, Array<{ neighbor: string; score: number; edge: RelationshipEdge }>>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }
  for (const edge of allEdges) {
    adj.get(edge.source)?.push({ neighbor: edge.target, score: edge.score, edge });
    adj.get(edge.target)?.push({ neighbor: edge.source, score: edge.score, edge });
  }

  // For each node, keep top-K neighbors
  const knnSets = new Map<string, Set<string>>();
  for (const [id, neighbors] of adj) {
    neighbors.sort((a, b) => b.score - a.score);
    const topK = new Set(neighbors.slice(0, k).map((n) => n.neighbor));
    knnSets.set(id, topK);
  }

  // Symmetrize with OR and collect unique edges
  const edgeKey = (a: string, b: string) => (a < b ? `${a}\0${b}` : `${b}\0${a}`);
  const keptKeys = new Set<string>();
  const edgeMap = new Map<string, RelationshipEdge>();

  // Index original edges for lookup
  for (const edge of allEdges) {
    edgeMap.set(edgeKey(edge.source, edge.target), edge);
  }

  const result: RelationshipEdge[] = [];

  for (const [id, neighbors] of knnSets) {
    for (const neighbor of neighbors) {
      const key = edgeKey(id, neighbor);
      if (keptKeys.has(key)) continue;
      keptKeys.add(key);

      const originalEdge = edgeMap.get(key);
      if (!originalEdge) continue;

      if (useSNN) {
        // SNN weight = |neighbors(A) ∩ neighbors(B)| / K
        const neighborsA = knnSets.get(id)!;
        const neighborsB = knnSets.get(neighbor)!;
        let shared = 0;
        for (const n of neighborsA) {
          if (neighborsB.has(n)) shared++;
        }
        const snnWeight = shared / k;

        result.push({
          ...originalEdge,
          score: snnWeight > 0 ? snnWeight : originalEdge.score * 0.1, // keep weak link if no shared neighbors
        });
      } else {
        result.push(originalEdge);
      }
    }
  }

  console.log(`KNN graph: ${result.length} edges (k=${k}, SNN=${useSNN})`);
  return result;
}

/**
 * Compute clusters from relationship edges using Louvain algorithm
 */
export function computeClusters(
  edges: RelationshipEdge[],
  nodeIds: string[]
): ClusterResult {
  // Build a graphology graph
  const graph = new Graph({ type: 'undirected' });

  // Add all nodes
  for (const nodeId of nodeIds) {
    graph.addNode(nodeId);
  }

  // Add edges with weights (similarity scores)
  for (const edge of edges) {
    // Skip if either node not in our set
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) {
      continue;
    }
    // Skip if edge already exists (shouldn't happen but be safe)
    if (graph.hasEdge(edge.source, edge.target)) {
      continue;
    }
    graph.addEdge(edge.source, edge.target, { weight: edge.score });
  }

  // Run Louvain community detection with detailed results
  // Resolution parameter: higher = more clusters, lower = fewer clusters
  const result = louvain.detailed(graph, {
    resolution: 1.0,
    randomWalk: true,
  });

  const communities = result.communities;
  const modularity = result.modularity;

  // Build nodeCluster mapping
  const nodeCluster: Record<string, number> = {};
  for (const nodeId of nodeIds) {
    nodeCluster[nodeId] = communities[nodeId] ?? 0;
  }

  // Count nodes per cluster
  const clusterCounts = new Map<number, number>();
  for (const clusterId of Object.values(nodeCluster)) {
    clusterCounts.set(clusterId, (clusterCounts.get(clusterId) || 0) + 1);
  }

  // Compute cluster positions (arrange in a circle)
  const clusterMeta = computeClusterPositions(clusterCounts);

  console.log(
    `Detected ${clusterMeta.length} clusters with modularity ${modularity.toFixed(3)}`
  );

  return {
    nodeCluster,
    clusterMeta,
    modularity,
  };
}

/**
 * Generate human-readable names for clusters.
 * Primary: tag-based naming using TF-ICF when >= 3 nodes have tags.
 * Fallback: body TF-IDF for clusters without sufficient tag coverage.
 * Only names clusters with 3+ nodes.
 */
export function generateClusterNames(
  nodes: ContentNode[],
  nodeCluster: Record<string, number>,
  clusterMeta: ClusterMeta[]
): void {
  // Group nodes by cluster
  const clusterNodes = new Map<number, ContentNode[]>();
  for (const node of nodes) {
    const clusterId = nodeCluster[node.id];
    if (clusterId == null) continue;
    if (!clusterNodes.has(clusterId)) clusterNodes.set(clusterId, []);
    clusterNodes.get(clusterId)!.push(node);
  }

  // Only name clusters with 3+ nodes
  const eligibleClusters = [...clusterNodes.entries()].filter(
    ([, members]) => members.length >= 3
  );

  if (eligibleClusters.length === 0) return;

  // Determine which clusters have enough tag coverage (>= 3 nodes with tags)
  const clusterTagCounts = new Map<number, Map<string, number>>();
  const tagEligibleClusters: Array<[number, ContentNode[]]> = [];
  const fallbackClusters: Array<[number, ContentNode[]]> = [];

  for (const [clusterId, members] of eligibleClusters) {
    const nodesWithTags = members.filter((n) => n.tags && n.tags.length > 0);
    if (nodesWithTags.length >= 3) {
      tagEligibleClusters.push([clusterId, members]);
      // Count tag frequencies
      const tagCounts = new Map<string, number>();
      for (const node of members) {
        for (const tag of node.tags) {
          const normalized = tag.toLowerCase().trim();
          if (normalized) {
            tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
          }
        }
      }
      clusterTagCounts.set(clusterId, tagCounts);
    } else {
      fallbackClusters.push([clusterId, members]);
    }
  }

  // --- Primary: Tag-based naming with TF-ICF ---
  if (tagEligibleClusters.length > 0) {
    // Compute inverse-cluster-frequency for each tag
    const tagClusterFreq = new Map<string, number>();
    for (const [, tagCounts] of clusterTagCounts) {
      for (const tag of tagCounts.keys()) {
        tagClusterFreq.set(tag, (tagClusterFreq.get(tag) || 0) + 1);
      }
    }
    const totalTagClusters = tagEligibleClusters.length;

    for (const [clusterId] of tagEligibleClusters) {
      const tagCounts = clusterTagCounts.get(clusterId)!;
      const totalTags = [...tagCounts.values()].reduce((a, b) => a + b, 0);
      const scored: [string, number][] = [];

      for (const [tag, count] of tagCounts) {
        const tf = count / totalTags;
        const icf =
          Math.log((totalTagClusters + 1) / ((tagClusterFreq.get(tag) || 0) + 1)) + 1;
        scored.push([tag, tf * icf]);
      }

      scored.sort((a, b) => b[1] - a[1]);

      let name: string;
      if (scored.length === 0) {
        name = `Cluster ${clusterId}`;
      } else if (scored.length === 1 || scored[0][1] > 3 * scored[1][1]) {
        // Single dominant tag
        name = capitalize(scored[0][0]);
      } else {
        name = scored
          .slice(0, 2)
          .map(([t]) => capitalize(t))
          .join(' & ');
      }

      const meta = clusterMeta.find((c) => c.id === clusterId);
      if (meta) {
        meta.name = name;
      }
    }
  }

  // --- Fallback: Body TF-IDF for clusters without enough tags ---
  if (fallbackClusters.length > 0) {
    const clusterTermCounts = new Map<number, Map<string, number>>();
    const stemToOriginal = new Map<string, Map<string, number>>();

    for (const [clusterId, members] of fallbackClusters) {
      const termCounts = new Map<string, number>();
      for (const node of members) {
        // Track original forms from body text
        const rawBody = node.body || '';
        const cleaned = rawBody.replace(/[^a-zA-Z\s]/g, ' ').toLowerCase();
        const rawTokens = cleaned
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
          .slice(0, 500);

        for (const rawToken of rawTokens) {
          const stemmed = stem(rawToken);
          if (!stemToOriginal.has(stemmed)) stemToOriginal.set(stemmed, new Map());
          const origMap = stemToOriginal.get(stemmed)!;
          origMap.set(rawToken, (origMap.get(rawToken) || 0) + 1);
        }

        // Use extractTerms on body, capped at 500 terms
        const terms = extractTerms(node.body).slice(0, 500);
        for (const term of terms) {
          termCounts.set(term, (termCounts.get(term) || 0) + 1);
        }
      }
      clusterTermCounts.set(clusterId, termCounts);
    }

    // Compute document frequency across fallback clusters
    const df = new Map<string, number>();
    for (const [, termCounts] of clusterTermCounts) {
      for (const term of termCounts.keys()) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }
    const totalDocs = fallbackClusters.length;

    function bestOriginal(stemmed: string): string {
      const origMap = stemToOriginal.get(stemmed);
      if (!origMap || origMap.size === 0) return stemmed;
      let best = stemmed;
      let bestCount = 0;
      for (const [orig, count] of origMap) {
        if (count > bestCount) {
          best = orig;
          bestCount = count;
        }
      }
      return best.charAt(0).toUpperCase() + best.slice(1);
    }

    for (const [clusterId, termCounts] of clusterTermCounts) {
      const totalTerms = [...termCounts.values()].reduce((a, b) => a + b, 0);
      const scored: [string, number][] = [];

      for (const [term, count] of termCounts) {
        if (term.length < 4) continue;
        const tf = count / totalTerms;
        const idf = Math.log((totalDocs + 1) / ((df.get(term) || 0) + 1)) + 1;
        scored.push([term, tf * idf]);
      }

      scored.sort((a, b) => b[1] - a[1]);
      const topTerms = scored.slice(0, 2).map(([t]) => bestOriginal(t));
      const name = topTerms.length > 0 ? topTerms.join(' & ') : `Cluster ${clusterId}`;

      const meta = clusterMeta.find((c) => c.id === clusterId);
      if (meta) {
        meta.name = name;
      }
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Compute x,y center positions for each cluster
 * Arranges clusters in a circle, with larger clusters getting more space
 */
function computeClusterPositions(
  clusterCounts: Map<number, number>
): ClusterMeta[] {
  const clusterIds = Array.from(clusterCounts.keys()).sort((a, b) => a - b);
  const numClusters = clusterIds.length;

  if (numClusters === 0) {
    return [];
  }

  // Canvas radius for cluster centers - wide spacing for visual separation
  const radius = 800;

  // Arrange clusters in a circle
  const clusterMeta: ClusterMeta[] = [];

  for (let i = 0; i < numClusters; i++) {
    const clusterId = clusterIds[i];
    const nodeCount = clusterCounts.get(clusterId) || 0;

    // Position around the circle
    const angle = (2 * Math.PI * i) / numClusters - Math.PI / 2; // Start from top
    const centerX = Math.cos(angle) * radius;
    const centerY = Math.sin(angle) * radius;

    clusterMeta.push({
      id: clusterId,
      centerX,
      centerY,
      nodeCount,
    });
  }

  return clusterMeta;
}

/**
 * Compute initial x,y position for a node within its cluster
 */
export function computeNodePosition(
  nodeId: string,
  nodeCluster: Record<string, number>,
  clusterMeta: ClusterMeta[],
  nodeIndex: number
): { x: number; y: number } {
  const clusterId = nodeCluster[nodeId];
  const cluster = clusterMeta.find((c) => c.id === clusterId);

  if (!cluster) {
    // Fallback to center
    return { x: 0, y: 0 };
  }

  // Spread nodes within the cluster using a spiral pattern
  // This gives better initial distribution than random
  const nodeCount = cluster.nodeCount;
  const clusterRadius = Math.sqrt(nodeCount) * 80; // Room for labels within clusters

  // Use golden angle spiral for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = nodeIndex * goldenAngle;
  const r = clusterRadius * Math.sqrt(nodeIndex / Math.max(nodeCount, 1));

  return {
    x: cluster.centerX + Math.cos(angle) * r,
    y: cluster.centerY + Math.sin(angle) * r,
  };
}
