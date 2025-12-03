import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { ContentNode, RelationshipCache, RelationshipConfig } from './types.js';

const CACHE_FILE = '.relationships-cache.json';
const CACHE_VERSION = '1.0';

/**
 * Load the relationship cache from disk
 */
export async function loadCache(): Promise<RelationshipCache | null> {
  try {
    const cachePath = path.join(process.cwd(), CACHE_FILE);
    const data = await fs.readFile(cachePath, 'utf-8');
    const cache = JSON.parse(data) as RelationshipCache;

    // Verify version
    if (cache.version !== CACHE_VERSION) {
      console.log('Cache version mismatch, will rebuild');
      return null;
    }

    return cache;
  } catch (error) {
    // Cache doesn't exist or is invalid
    return null;
  }
}

/**
 * Save the relationship cache to disk
 */
export async function saveCache(cache: RelationshipCache): Promise<void> {
  const cachePath = path.join(process.cwd(), CACHE_FILE);
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
}

/**
 * Compute hash of a content node
 */
export function hashContent(node: ContentNode): string {
  const content = JSON.stringify({
    title: node.title,
    tags: node.tags.sort(),
    body: node.body.slice(0, 2000), // First 2000 chars for efficiency
    date: node.date,
  });

  return createHash('md5').update(content).digest('hex').slice(0, 16);
}

/**
 * Compute hash of the config
 */
export function hashConfig(config: RelationshipConfig): string {
  return createHash('md5')
    .update(JSON.stringify(config))
    .digest('hex')
    .slice(0, 16);
}

export interface ChangeSet {
  added: string[];
  modified: string[];
  deleted: string[];
  configChanged: boolean;
}

/**
 * Detect changes since last cache
 */
export function detectChanges(
  nodes: ContentNode[],
  config: RelationshipConfig,
  cache: RelationshipCache | null
): ChangeSet {
  const changeSet: ChangeSet = {
    added: [],
    modified: [],
    deleted: [],
    configChanged: false,
  };

  // Check config change
  const currentConfigHash = hashConfig(config);
  if (!cache || cache.configHash !== currentConfigHash) {
    changeSet.configChanged = true;
  }

  if (!cache) {
    // No cache, everything is new
    changeSet.added = nodes.map((n) => n.id);
    return changeSet;
  }

  const currentHashes = new Map<string, string>();
  for (const node of nodes) {
    currentHashes.set(node.id, hashContent(node));
  }

  // Find added and modified
  for (const node of nodes) {
    const currentHash = currentHashes.get(node.id)!;
    const cachedHash = cache.contentHashes[node.id];

    if (!cachedHash) {
      changeSet.added.push(node.id);
    } else if (cachedHash !== currentHash) {
      changeSet.modified.push(node.id);
    }
  }

  // Find deleted
  const currentIds = new Set(nodes.map((n) => n.id));
  for (const cachedId of Object.keys(cache.contentHashes)) {
    if (!currentIds.has(cachedId)) {
      changeSet.deleted.push(cachedId);
    }
  }

  return changeSet;
}

/**
 * Determine if we should do a full rebuild
 */
export function shouldFullRebuild(
  changeSet: ChangeSet,
  totalNodes: number
): boolean {
  // Full rebuild if:
  // 1. Config changed (weights affect all edges)
  // 2. More than 30% of nodes changed
  // 3. No existing cache

  if (changeSet.configChanged) {
    return true;
  }

  const totalChanges =
    changeSet.added.length + changeSet.modified.length + changeSet.deleted.length;

  if (totalNodes === 0 || totalChanges / totalNodes > 0.3) {
    return true;
  }

  return false;
}

/**
 * Get cached embeddings for unchanged nodes
 */
export function getCachedEmbeddings(
  nodes: ContentNode[],
  cache: RelationshipCache | null,
  changeSet: ChangeSet
): Map<string, number[]> {
  const embeddings = new Map<string, number[]>();

  if (!cache || changeSet.configChanged) {
    return embeddings;
  }

  const changedIds = new Set([...changeSet.added, ...changeSet.modified]);

  for (const node of nodes) {
    if (!changedIds.has(node.id) && cache.embeddings[node.id]) {
      embeddings.set(node.id, cache.embeddings[node.id]);
    }
  }

  return embeddings;
}

/**
 * Create a new cache from computed data
 */
export function createCache(
  nodes: ContentNode[],
  config: RelationshipConfig,
  embeddings: Map<string, number[]>
): RelationshipCache {
  const contentHashes: Record<string, string> = {};
  for (const node of nodes) {
    contentHashes[node.id] = hashContent(node);
  }

  const embeddingsRecord: Record<string, number[]> = {};
  for (const [id, embedding] of embeddings) {
    // Reduce precision to save space
    embeddingsRecord[id] = embedding.map((v) => Math.round(v * 10000) / 10000);
  }

  return {
    version: CACHE_VERSION,
    configHash: hashConfig(config),
    contentHashes,
    embeddings: embeddingsRecord,
    lastBuild: new Date().toISOString(),
  };
}
