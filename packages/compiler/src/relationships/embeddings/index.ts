import type { ContentNode } from '../types.js';

let pipeline: any = null;
let model: any = null;

/**
 * Initialize the embedding model
 * Uses dynamic import to avoid loading transformers.js unless needed
 */
async function initializeModel(modelName: string): Promise<void> {
  if (model) return;

  console.log(`Loading embedding model: ${modelName}...`);

  try {
    // Dynamic import to avoid loading at module level
    const { pipeline: createPipeline } = await import('@xenova/transformers');
    pipeline = createPipeline;

    model = await pipeline('feature-extraction', modelName, {
      quantized: true, // Use quantized model for faster inference
    });

    console.log('Embedding model loaded');
  } catch (error) {
    console.error('Failed to load embedding model:', error);
    throw error;
  }
}

/**
 * Compute embedding for a single text
 */
async function computeEmbedding(text: string): Promise<number[]> {
  if (!model) {
    throw new Error('Model not initialized. Call initializeModel first.');
  }

  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert to plain array
  return Array.from(output.data as Float32Array);
}

export interface EmbeddingService {
  initialize(modelName: string): Promise<void>;
  computeEmbeddings(
    nodes: ContentNode[],
    existingEmbeddings?: Map<string, number[]>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, number[]>>;
}

/**
 * Create an embedding service
 */
export function createEmbeddingService(): EmbeddingService {
  return {
    async initialize(modelName: string): Promise<void> {
      await initializeModel(modelName);
    },

    async computeEmbeddings(
      nodes: ContentNode[],
      existingEmbeddings: Map<string, number[]> = new Map(),
      onProgress?: (current: number, total: number) => void
    ): Promise<Map<string, number[]>> {
      const embeddings = new Map<string, number[]>();

      // Copy existing embeddings
      for (const [id, embedding] of existingEmbeddings) {
        embeddings.set(id, embedding);
      }

      // Find nodes that need embeddings
      const nodesToEmbed = nodes.filter((n) => !embeddings.has(n.id));

      if (nodesToEmbed.length === 0) {
        console.log('All embeddings cached');
        return embeddings;
      }

      console.log(`Computing embeddings for ${nodesToEmbed.length} documents...`);

      for (let i = 0; i < nodesToEmbed.length; i++) {
        const node = nodesToEmbed[i];

        // Prepare text: title + first ~1500 chars of body
        const cleanBody = cleanTextForEmbedding(node.body);
        const text = `${node.title}\n\n${cleanBody}`.slice(0, 1500);

        try {
          const embedding = await computeEmbedding(text);
          embeddings.set(node.id, embedding);
        } catch (error) {
          console.error(`Failed to compute embedding for ${node.id}:`, error);
          // Continue with other documents
        }

        if (onProgress) {
          onProgress(i + 1, nodesToEmbed.length);
        }
      }

      return embeddings;
    },
  };
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
  cleaned = cleaned.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => display || target);
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

export default createEmbeddingService;
