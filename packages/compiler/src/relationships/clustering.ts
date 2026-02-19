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
 * Generate human-readable names for clusters using TF-IDF on member titles.
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

  // Build per-cluster "documents" from concatenated titles
  // Track stemmed -> original form mapping with counts
  const clusterTermCounts = new Map<number, Map<string, number>>();
  const stemToOriginal = new Map<string, Map<string, number>>(); // stem -> (original -> count)

  for (const [clusterId, members] of eligibleClusters) {
    const termCounts = new Map<string, number>();
    for (const node of members) {
      // Tokenize title without stemming first, to track originals
      const rawTitle = node.title || '';
      const cleaned = rawTitle
        .replace(/[^a-zA-Z\s]/g, ' ')
        .toLowerCase();
      const rawTokens = cleaned
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      for (const rawToken of rawTokens) {
        const stemmed = stem(rawToken);
        // Track original forms
        if (!stemToOriginal.has(stemmed)) stemToOriginal.set(stemmed, new Map());
        const origMap = stemToOriginal.get(stemmed)!;
        origMap.set(rawToken, (origMap.get(rawToken) || 0) + 1);
      }

      // Use extractTerms for the actual TF-IDF terms (these are stemmed)
      const terms = extractTerms(node.title);
      for (const term of terms) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }
    clusterTermCounts.set(clusterId, termCounts);
  }

  // Compute document frequency across clusters
  const df = new Map<string, number>();
  for (const [, termCounts] of clusterTermCounts) {
    for (const term of termCounts.keys()) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const totalDocs = eligibleClusters.length;

  // Helper to get the best original (unstemmed) form for a stemmed term
  function bestOriginal(stemmed: string): string {
    const origMap = stemToOriginal.get(stemmed);
    if (!origMap || origMap.size === 0) return stemmed;
    // Pick the most common original form
    let best = stemmed;
    let bestCount = 0;
    for (const [orig, count] of origMap) {
      if (count > bestCount) {
        best = orig;
        bestCount = count;
      }
    }
    // Capitalize first letter
    return best.charAt(0).toUpperCase() + best.slice(1);
  }

  // Compute TF-IDF per cluster and pick top terms
  for (const [clusterId, termCounts] of clusterTermCounts) {
    const totalTerms = [...termCounts.values()].reduce((a, b) => a + b, 0);
    const scored: [string, number][] = [];

    for (const [term, count] of termCounts) {
      // Skip very short stems that produce unreadable labels
      if (term.length < 4) continue;
      const tf = count / totalTerms;
      const idf = Math.log((totalDocs + 1) / ((df.get(term) || 0) + 1)) + 1;
      scored.push([term, tf * idf]);
    }

    scored.sort((a, b) => b[1] - a[1]);
    const topTerms = scored.slice(0, 3).map(([t]) => bestOriginal(t));
    const name = topTerms.join(' / ');

    // Attach name to the corresponding clusterMeta entry
    const meta = clusterMeta.find((c) => c.id === clusterId);
    if (meta) {
      meta.name = name;
    }
  }
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
