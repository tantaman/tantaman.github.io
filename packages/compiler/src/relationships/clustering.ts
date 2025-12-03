/**
 * Cluster detection for relationship graph using Louvain community detection
 */
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import type { RelationshipEdge } from './types.js';

export interface ClusterMeta {
  id: number;
  centerX: number;
  centerY: number;
  nodeCount: number;
}

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

  // Canvas radius for cluster centers
  const radius = 400;

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
  const clusterRadius = Math.sqrt(nodeCount) * 40; // Scale with cluster size

  // Use golden angle spiral for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = nodeIndex * goldenAngle;
  const r = clusterRadius * Math.sqrt(nodeIndex / Math.max(nodeCount, 1));

  return {
    x: cluster.centerX + Math.cos(angle) * r,
    y: cluster.centerY + Math.sin(angle) * r,
  };
}
