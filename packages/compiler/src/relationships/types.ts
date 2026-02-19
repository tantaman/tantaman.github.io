/**
 * Core types for the content relationship system
 */

export interface ContentNode {
  id: string; // filename (e.g., "2022-08-23-why-sqlite-why-now.md")
  collection: string; // '', 'the-mirror-room/', 'chats/', 'notes/', 'bookmarks/'
  title: string;
  body: string; // raw markdown content (without frontmatter)
  tags: string[];
  date: string | null; // YYYY-MM-DD format
  wikiLinks: string[]; // outbound [[links]] extracted from body
  compiledFilename: string; // e.g., "why-sqlite-why-now.html"
}

export interface SignalBreakdown {
  name: string;
  score: number; // 0-1 normalized
  weight: number;
  details?: Record<string, unknown>;
}

export type EdgeType = 'explicit' | 'semantic' | 'inferred';

export interface RelationshipEdge {
  source: string;
  target: string;
  score: number; // 0-1 normalized combined score
  signals: SignalBreakdown[];
  edgeType: EdgeType;
}

export interface PostRelationships {
  related: Array<{
    id: string;
    score: number;
    type: EdgeType;
  }>;
  backlinks: string[];
  keywords: string[];
  embedding?: number[]; // cached embedding vector
}

export interface ClusterMeta {
  id: number;
  centerX: number;
  centerY: number;
  nodeCount: number;
  name?: string;
}

export interface ClusterData {
  nodeCluster: Record<string, number>; // nodeId -> clusterId
  clusterMeta: ClusterMeta[];
  modularity: number;
}

export interface RelationshipGraph {
  version: string;
  generatedAt: string;
  config: {
    model: string;
    minScore: number;
    maxRelated: number;
  };
  posts: Record<string, PostRelationships>;
  edges: RelationshipEdge[];
  clusters?: ClusterData;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    buildTimeMs: number;
    signalsUsed: string[];
  };
}

export interface RelationshipCache {
  version: string;
  configHash: string;
  contentHashes: Record<string, string>;
  embeddings: Record<string, number[]>;
  lastBuild: string;
}

export interface SignalConfig {
  enabled: boolean;
  weight: number;
  options?: Record<string, unknown>;
}

export interface RelationshipConfig {
  signals: {
    wikilink: SignalConfig;
    semantic: SignalConfig;
    text: SignalConfig;
    temporal: SignalConfig;
    collection: SignalConfig;
    tags: SignalConfig;
  };
  scoring: {
    minThreshold: number;
    maxRelated: number;
    multiSignalBonus: number;
  };
  embedding: {
    model: string;
    dimensions: number;
  };
}
