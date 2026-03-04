import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';
import type { SignalExtractor } from './base.js';

interface SemanticData {
  embedding: number[] | null;
  textForEmbedding: string;
}

interface GlobalSemanticData {
  embeddings: Map<string, number[]>;
}

/**
 * Semantic similarity signal using embeddings
 *
 * Uses transformers.js to compute document embeddings and
 * cosine similarity for semantic matching.
 */
export const semanticSignal: SignalExtractor<SemanticData> = {
  name: 'semantic',
  isSymmetric: true,

  extract(node: ContentNode): SemanticData {
    // Prepare text for embedding (title + first ~1000 chars of body)
    const cleanBody = cleanTextForEmbedding(node.body);
    const textForEmbedding = `${node.title}\n\n${cleanBody}`;

    return {
      embedding: null, // Will be populated by embedding service
      textForEmbedding,
    };
  },

  computeScore(
    nodeA: ContentNode,
    nodeB: ContentNode,
    dataA: SemanticData,
    dataB: SemanticData,
    config: SignalConfig,
    globalData?: unknown
  ): SignalBreakdown {
    const global = globalData as GlobalSemanticData | undefined;

    // Get embeddings from global data (computed by embedding service)
    const embeddingA = global?.embeddings.get(nodeA.id) || dataA.embedding;
    const embeddingB = global?.embeddings.get(nodeB.id) || dataB.embedding;

    if (!embeddingA || !embeddingB) {
      return {
        name: 'semantic',
        score: 0,
        weight: config.weight,
        details: { reason: 'missing_embedding' },
      };
    }

    // Compute cosine similarity
    const similarity = cosineSimilarity(embeddingA, embeddingB);

    // Check minimum threshold
    const minSimilarity = (config.options?.minSimilarity as number) || 0.3;
    if (similarity < minSimilarity) {
      return {
        name: 'semantic',
        score: 0,
        weight: config.weight,
        details: { similarity, reason: 'below_threshold' },
      };
    }

    // Use raw cosine similarity directly as the score.
    // Normalization was destroying ranking distinction in dense topic clusters
    // (e.g. philosophy posts with raw sims 0.67–0.86 all mapped to ~1.0).
    return {
      name: 'semantic',
      score: similarity,
      weight: config.weight,
      details: { similarity },
    };
  },
};

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Clean text for embedding (remove markdown syntax, code, etc.)
 */
function cleanTextForEmbedding(text: string): string {
  let cleaned = text;

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  cleaned = cleaned.replace(/`[^`]+`/g, '');
  // Remove markdown links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove wiki-links but keep text
  cleaned = cleaned.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2$1');
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Remove frontmatter markers
  cleaned = cleaned.replace(/^---[\s\S]*?---/m, '');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

export { cosineSimilarity };
export default semanticSignal;
