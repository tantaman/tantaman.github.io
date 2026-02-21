import type { Env } from "./index";
import { embedText } from "./embeddings";

const SIMILARITY_THRESHOLD = 0.78;
const MAX_NEIGHBORS = 10;
const CLUSTER_ITERATIONS = 5;
const GRAPH_CACHE_KEY = "graph:clusters";

/**
 * After a thought is created, find its nearest neighbors in Vectorize
 * and store edges (bidirectional) in D1 for any pair above the threshold.
 */
export async function computeEdgesForThought(
  env: Env,
  thoughtId: number,
  body: string
): Promise<void> {
  try {
    const vec = await embedText(env.AI, body);
    // Query extra to account for self-match
    const results = await env.VECTORIZE.query(vec, {
      topK: MAX_NEIGHBORS + 1,
      returnMetadata: "none",
    });

    const edges: { targetId: number; score: number }[] = [];
    for (const match of results.matches) {
      const targetId = parseInt(match.id, 10);
      if (targetId === thoughtId) continue;
      if (match.score < SIMILARITY_THRESHOLD) continue;
      edges.push({ targetId, score: match.score });
    }

    if (edges.length === 0) return;

    // Batch insert edges (bidirectional)
    const stmts = edges.flatMap(({ targetId, score }) => [
      env.DB.prepare(
        "INSERT OR REPLACE INTO thought_edge (source_id, target_id, score) VALUES (?, ?, ?)"
      ).bind(thoughtId, targetId, score),
      env.DB.prepare(
        "INSERT OR REPLACE INTO thought_edge (source_id, target_id, score) VALUES (?, ?, ?)"
      ).bind(targetId, thoughtId, score),
    ]);

    await env.DB.batch(stmts);

    // Invalidate cache
    await invalidateGraphCache(env);
  } catch (e) {
    console.error("Failed to compute edges for thought:", e);
  }
}

/**
 * Delete all edges involving the given thought IDs and invalidate cache.
 */
export async function deleteEdgesForThoughts(
  env: Env,
  ids: number[]
): Promise<void> {
  if (ids.length === 0) return;
  try {
    const placeholders = ids.map(() => "?").join(",");
    await env.DB.prepare(
      `DELETE FROM thought_edge WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})`
    ).bind(...ids, ...ids).run();
    await invalidateGraphCache(env);
  } catch (e) {
    console.error("Failed to delete edges:", e);
  }
}

/**
 * Label propagation clustering on the thought_edge graph.
 * Each node starts with its own id as label, then iteratively adopts
 * the most common label among its neighbors (weighted by score).
 */
function labelPropagation(
  edges: { source_id: number; target_id: number; score: number }[],
  nodeIds: Set<number>
): Map<number, number[]> {
  // Build adjacency list
  const adj = new Map<number, { neighbor: number; score: number }[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }
  for (const e of edges) {
    adj.get(e.source_id)?.push({ neighbor: e.target_id, score: e.score });
  }

  // Initialize labels: each node's label is its own id
  const labels = new Map<number, number>();
  for (const id of nodeIds) {
    labels.set(id, id);
  }

  const nodeArray = [...nodeIds];

  for (let iter = 0; iter < CLUSTER_ITERATIONS; iter++) {
    // Shuffle for randomness
    for (let i = nodeArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nodeArray[i], nodeArray[j]] = [nodeArray[j], nodeArray[i]];
    }

    let changed = false;
    for (const node of nodeArray) {
      const neighbors = adj.get(node);
      if (!neighbors || neighbors.length === 0) continue;

      // Sum weights per neighbor label
      const labelWeights = new Map<number, number>();
      for (const { neighbor, score } of neighbors) {
        const nLabel = labels.get(neighbor)!;
        labelWeights.set(nLabel, (labelWeights.get(nLabel) || 0) + score);
      }

      // Pick label with max weight
      let bestLabel = labels.get(node)!;
      let bestWeight = 0;
      for (const [label, weight] of labelWeights) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestLabel = label;
        }
      }

      if (bestLabel !== labels.get(node)) {
        labels.set(node, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group nodes by label
  const clusters = new Map<number, number[]>();
  for (const [node, label] of labels) {
    if (!clusters.has(label)) clusters.set(label, []);
    clusters.get(label)!.push(node);
  }

  return clusters;
}

interface GraphNode {
  id: number;
  body: string;
  timestamp: number;
  cluster: number;
}

interface GraphEdge {
  source: number;
  target: number;
  score: number;
}

interface ClusterInfo {
  id: number;
  size: number;
  sample_bodies: string[];
}

interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: ClusterInfo[];
}

/**
 * Build the full graph response: nodes, edges, and cluster assignments.
 * Cached in KV with generation-based invalidation.
 */
export async function getGraph(env: Env): Promise<GraphResponse> {
  // Check cache
  const cached = await env.EMBEDDINGS.get(GRAPH_CACHE_KEY, "json");
  if (cached) return cached as GraphResponse;

  // Fetch all edges
  const edgeResults = await env.DB.prepare(
    "SELECT source_id, target_id, score FROM thought_edge"
  ).all();
  const edges = edgeResults.results as unknown as {
    source_id: number;
    target_id: number;
    score: number;
  }[];

  if (edges.length === 0) {
    const empty: GraphResponse = { nodes: [], edges: [], clusters: [] };
    await env.EMBEDDINGS.put(GRAPH_CACHE_KEY, JSON.stringify(empty), {
      expirationTtl: 3600,
    });
    return empty;
  }

  // Collect all node IDs from edges
  const nodeIds = new Set<number>();
  for (const e of edges) {
    nodeIds.add(e.source_id);
    nodeIds.add(e.target_id);
  }

  // Fetch thought metadata
  const idArray = [...nodeIds];
  const placeholders = idArray.map(() => "?").join(",");
  const thoughtResults = await env.DB.prepare(
    `SELECT id, body, timestamp FROM thought WHERE id IN (${placeholders})`
  ).bind(...idArray).all();

  const thoughtMap = new Map<number, { body: string; timestamp: number }>();
  for (const t of thoughtResults.results) {
    thoughtMap.set(t.id as number, {
      body: t.body as string,
      timestamp: t.timestamp as number,
    });
  }

  // Run clustering
  const clusterMap = labelPropagation(edges, nodeIds);

  // Build node-to-cluster lookup
  const nodeCluster = new Map<number, number>();
  for (const [label, members] of clusterMap) {
    for (const member of members) {
      nodeCluster.set(member, label);
    }
  }

  // Build nodes
  const nodes: GraphNode[] = [];
  for (const id of nodeIds) {
    const info = thoughtMap.get(id);
    if (!info) continue;
    nodes.push({
      id,
      body: info.body,
      timestamp: info.timestamp,
      cluster: nodeCluster.get(id) || id,
    });
  }

  // Deduplicate edges (only keep source < target direction for the response)
  const seenEdges = new Set<string>();
  const dedupedEdges: GraphEdge[] = [];
  for (const e of edges) {
    const key =
      e.source_id < e.target_id
        ? `${e.source_id}-${e.target_id}`
        : `${e.target_id}-${e.source_id}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    dedupedEdges.push({
      source: Math.min(e.source_id, e.target_id),
      target: Math.max(e.source_id, e.target_id),
      score: e.score,
    });
  }

  // Build cluster info
  const clusters: ClusterInfo[] = [];
  for (const [label, members] of clusterMap) {
    if (members.length < 2) continue; // Skip singletons
    const sampleBodies: string[] = [];
    for (const mid of members.slice(0, 3)) {
      const info = thoughtMap.get(mid);
      if (info) sampleBodies.push(info.body.slice(0, 100));
    }
    clusters.push({
      id: label,
      size: members.length,
      sample_bodies: sampleBodies,
    });
  }

  clusters.sort((a, b) => b.size - a.size);

  const response: GraphResponse = {
    nodes,
    edges: dedupedEdges,
    clusters,
  };

  // Cache for 1 hour
  await env.EMBEDDINGS.put(GRAPH_CACHE_KEY, JSON.stringify(response), {
    expirationTtl: 3600,
  });

  return response;
}

async function invalidateGraphCache(env: Env): Promise<void> {
  try {
    await env.EMBEDDINGS.delete(GRAPH_CACHE_KEY);
  } catch {
    // non-critical
  }
}
