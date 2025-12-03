import fs from 'fs/promises';
import path from 'path';
import { parse } from 'yaml';

import { collections } from '../collections.js';
import { defaultConfig } from './config.js';
import type {
  ContentNode,
  RelationshipGraph,
  RelationshipEdge,
  RelationshipConfig,
  PostRelationships,
  SignalBreakdown,
} from './types.js';
import {
  wikilinkSignal,
  tagsSignal,
  temporalSignal,
  collectionSignal,
  textSignal,
  semanticSignal,
  extractKeywords,
  type SignalExtractor,
} from './signals/index.js';
import { computeCombinedScore, passesThreshold } from './scorer.js';
import {
  loadCache,
  saveCache,
  detectChanges,
  shouldFullRebuild,
  getCachedEmbeddings,
  createCache,
} from './cache.js';
import { createEmbeddingService } from './embeddings/index.js';

const OUTPUT_FILE = '.relationships.json';

export interface BuildOptions {
  forceRebuild?: boolean;
  config?: Partial<RelationshipConfig>;
  skipEmbeddings?: boolean;
}

/**
 * Build the relationship graph for all content
 */
export async function buildRelationshipGraph(
  options: BuildOptions = {}
): Promise<RelationshipGraph> {
  const startTime = Date.now();
  const config = { ...defaultConfig, ...options.config } as RelationshipConfig;

  // Load all content nodes
  console.log('Loading content...');
  const nodes = await loadAllContent();
  console.log(`Loaded ${nodes.length} documents`);

  // Load cache and detect changes
  const cache = options.forceRebuild ? null : await loadCache();
  const changeSet = detectChanges(nodes, config, cache);

  const needsFullRebuild =
    options.forceRebuild || shouldFullRebuild(changeSet, nodes.length);

  if (needsFullRebuild) {
    console.log('Performing full rebuild...');
  } else if (
    changeSet.added.length ||
    changeSet.modified.length ||
    changeSet.deleted.length
  ) {
    console.log(
      `Incremental update: +${changeSet.added.length} ~${changeSet.modified.length} -${changeSet.deleted.length}`
    );
  } else {
    console.log('No changes detected');
  }

  // Initialize signals
  const signals: SignalExtractor[] = [];
  if (config.signals.wikilink.enabled) signals.push(wikilinkSignal);
  if (config.signals.tags.enabled) signals.push(tagsSignal);
  if (config.signals.temporal.enabled) signals.push(temporalSignal);
  if (config.signals.collection.enabled) signals.push(collectionSignal);
  if (config.signals.text.enabled) signals.push(textSignal);
  if (config.signals.semantic.enabled && !options.skipEmbeddings)
    signals.push(semanticSignal);

  // Compute embeddings if semantic signal is enabled
  let embeddings = new Map<string, number[]>();
  if (config.signals.semantic.enabled && !options.skipEmbeddings) {
    const cachedEmbeddings = getCachedEmbeddings(nodes, cache, changeSet);
    console.log(`${cachedEmbeddings.size} embeddings cached`);

    const embeddingService = createEmbeddingService();
    await embeddingService.initialize(config.embedding.model);

    embeddings = await embeddingService.computeEmbeddings(
      nodes,
      cachedEmbeddings,
      (current, total) => {
        if (current % 10 === 0 || current === total) {
          console.log(`Embedding progress: ${current}/${total}`);
        }
      }
    );
  }

  // Extract data for each signal
  console.log('Extracting signal data...');
  const extractedData = new Map<string, Map<string, unknown>>();
  const globalData = new Map<string, unknown>();

  // Compute global data (e.g., IDF scores for text signal)
  for (const signal of signals) {
    if (signal.computeGlobalData) {
      globalData.set(signal.name, signal.computeGlobalData(nodes));
    }
  }

  // Add embeddings to global data for semantic signal
  if (embeddings.size > 0) {
    globalData.set('semantic', { embeddings });
  }

  // Extract data per node
  for (const node of nodes) {
    const nodeData = new Map<string, unknown>();
    for (const signal of signals) {
      nodeData.set(signal.name, signal.extract(node, nodes));
    }
    extractedData.set(node.id, nodeData);
  }

  // Compute pairwise relationships
  console.log('Computing relationships...');
  const edges: RelationshipEdge[] = [];
  const nodeScores = new Map<string, Map<string, { score: number; type: string; signals: SignalBreakdown[] }>>();

  // Initialize score maps
  for (const node of nodes) {
    nodeScores.set(node.id, new Map());
  }

  // Compute all pairwise scores
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      const dataA = extractedData.get(nodeA.id)!;
      const dataB = extractedData.get(nodeB.id)!;

      // Compute contribution from each signal
      const contributions: SignalBreakdown[] = [];
      for (const signal of signals) {
        const signalConfig = config.signals[signal.name as keyof typeof config.signals];
        const signalGlobalData = globalData.get(signal.name);

        const contribution = signal.computeScore(
          nodeA,
          nodeB,
          dataA.get(signal.name),
          dataB.get(signal.name),
          signalConfig,
          signalGlobalData
        );
        contributions.push(contribution);
      }

      // Combine scores
      const result = computeCombinedScore(contributions, config);

      // Only add if above threshold
      if (passesThreshold(result.score, config)) {
        edges.push({
          source: nodeA.id,
          target: nodeB.id,
          score: result.score,
          signals: result.signals,
          edgeType: result.edgeType,
        });

        // Store for per-node lookup
        nodeScores.get(nodeA.id)!.set(nodeB.id, {
          score: result.score,
          type: result.edgeType,
          signals: result.signals,
        });
        nodeScores.get(nodeB.id)!.set(nodeA.id, {
          score: result.score,
          type: result.edgeType,
          signals: result.signals,
        });
      }
    }

    // Progress update
    if ((i + 1) % 20 === 0) {
      console.log(`Processed ${i + 1}/${nodes.length} nodes`);
    }
  }

  // Sort edges by score
  edges.sort((a, b) => b.score - a.score);

  // Build per-post data
  const posts: Record<string, PostRelationships> = {};
  const textGlobalData = globalData.get('text') as { idf: Map<string, number> } | undefined;

  for (const node of nodes) {
    const nodeRelations = nodeScores.get(node.id)!;

    // Get top related, sorted by score
    const related = [...nodeRelations.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, config.scoring.maxRelated)
      .map(([id, data]) => ({
        id,
        score: Math.round(data.score * 1000) / 1000,
        type: data.type as 'explicit' | 'semantic' | 'inferred',
      }));

    // Get backlinks (nodes that wiki-link to this one)
    const backlinks = findBacklinks(node.id, nodes, extractedData);

    // Extract keywords
    const keywords = textGlobalData
      ? extractKeywords(node, textGlobalData as any, 10)
      : [];

    posts[node.id] = {
      related,
      backlinks,
      keywords,
    };
  }

  const buildTime = Date.now() - startTime;

  const graph: RelationshipGraph = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    config: {
      model: config.embedding.model,
      minScore: config.scoring.minThreshold,
      maxRelated: config.scoring.maxRelated,
    },
    posts,
    edges: edges.slice(0, 1000), // Limit edges to top 1000
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      buildTimeMs: buildTime,
      signalsUsed: signals.map((s) => s.name),
    },
  };

  // Save cache
  console.log('Saving cache...');
  const newCache = createCache(nodes, config, embeddings);
  await saveCache(newCache);

  // Write output
  console.log('Writing output...');
  await writeOutput(graph);

  console.log(`Built ${edges.length} relationships in ${buildTime}ms`);

  return graph;
}

/**
 * Load all content from collections
 */
async function loadAllContent(): Promise<ContentNode[]> {
  const nodes: ContentNode[] = [];

  for (const collection of collections) {
    const contentDir = path.join(process.cwd(), 'content', collection);

    let files: string[];
    try {
      files = await fs.readdir(contentDir);
    } catch {
      continue; // Collection directory doesn't exist
    }

    const mdFiles = files.filter((file) => {
      const ext = path.extname(file);
      const basename = path.basename(file, ext);
      return (
        (ext === '.md' || ext === '.mdx') &&
        basename !== '404' &&
        basename !== 'README' &&
        !file.startsWith('.')
      );
    });

    for (const file of mdFiles) {
      const filePath = path.join(contentDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      const node = parseContent(file, collection, content);
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * Parse content file into ContentNode
 */
function parseContent(
  filename: string,
  collection: string,
  content: string
): ContentNode {
  // Extract frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---([\s\S]*)/);
  const frontmatter = match ? parse(match[1]) : {};
  const body = match ? match[2] : content;

  // Extract wiki-links from body
  const wikiLinks: string[] = [];
  const wikiLinkPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let linkMatch;
  while ((linkMatch = wikiLinkPattern.exec(body)) !== null) {
    wikiLinks.push(linkMatch[1].trim());
  }

  // Extract date from filename or frontmatter
  let date = frontmatter.date || null;
  if (!date) {
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    date = dateMatch ? dateMatch[1] : null;
  }

  return {
    id: collection + filename,
    collection,
    title: frontmatter.title || filename.replace(/\.(md|mdx)$/, ''),
    body,
    tags: frontmatter.tags || [],
    date,
    wikiLinks,
    compiledFilename:
      collection + path.basename(filename, path.extname(filename)) + '.html',
  };
}

/**
 * Find backlinks (nodes that link to this one)
 */
function findBacklinks(
  nodeId: string,
  nodes: ContentNode[],
  extractedData: Map<string, Map<string, unknown>>
): string[] {
  const backlinks: string[] = [];
  const normalizedTarget = normalizeWikiLinkTarget(nodeId);

  for (const node of nodes) {
    if (node.id === nodeId) continue;

    const wikilinkData = extractedData.get(node.id)?.get('wikilink') as
      | { outboundLinks: Set<string> }
      | undefined;

    if (wikilinkData?.outboundLinks.has(normalizedTarget)) {
      backlinks.push(node.id);
    }
  }

  return backlinks;
}

/**
 * Normalize wiki-link target for matching
 */
function normalizeWikiLinkTarget(target: string): string {
  return target
    .toLowerCase()
    .replace(/\.(md|mdx)$/, '')
    .replace(/ /g, '-')
    .replace(/^(notes\/|bookmarks\/|the-mirror-room\/|chats\/)/, '');
}

/**
 * Write the relationship graph to disk
 */
async function writeOutput(graph: RelationshipGraph): Promise<void> {
  const outputPath = path.join(process.cwd(), OUTPUT_FILE);
  await fs.writeFile(outputPath, JSON.stringify(graph, null, 2));
}

/**
 * Load existing relationship graph (for use by other modules)
 */
export async function loadRelationshipGraph(): Promise<RelationshipGraph | null> {
  try {
    const outputPath = path.join(process.cwd(), OUTPUT_FILE);
    const data = await fs.readFile(outputPath, 'utf-8');
    return JSON.parse(data) as RelationshipGraph;
  } catch {
    return null;
  }
}
