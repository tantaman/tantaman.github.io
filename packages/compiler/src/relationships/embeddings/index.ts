import 'dotenv/config';
import OpenAI from 'openai';
import type { ContentNode } from '../types.js';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI();
  }
  return client;
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
 * Create an embedding service using OpenAI text-embedding-3-large
 */
export function createEmbeddingService(): EmbeddingService {
  let modelName = 'text-embedding-3-large';

  return {
    async initialize(model: string): Promise<void> {
      modelName = model;
      // Validate that we have an API key
      getClient();
      console.log(`Using OpenAI embedding model: ${modelName}`);
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

      // Process in batches of 100 (OpenAI supports up to 2048 inputs per request)
      const batchSize = 100;
      let completed = 0;

      for (let i = 0; i < nodesToEmbed.length; i += batchSize) {
        const batch = nodesToEmbed.slice(i, i + batchSize);
        const texts = batch.map((node) => {
          const cleanBody = cleanTextForEmbedding(node.body);
          return `${node.title}\n\n${cleanBody}`;
        });

        try {
          const response = await getClient().embeddings.create({
            model: modelName,
            input: texts,
          });

          for (let j = 0; j < response.data.length; j++) {
            embeddings.set(batch[j].id, response.data[j].embedding);
          }
        } catch (error) {
          console.error(`Failed to compute embeddings for batch starting at ${i}:`, error);
          // Fall back to one-by-one for this batch
          for (const node of batch) {
            const cleanBody = cleanTextForEmbedding(node.body);
            const text = `${node.title}\n\n${cleanBody}`;
            try {
              const response = await getClient().embeddings.create({
                model: modelName,
                input: text,
              });
              embeddings.set(node.id, response.data[0].embedding);
            } catch (err) {
              console.error(`Failed to compute embedding for ${node.id}:`, err);
            }
          }
        }

        completed += batch.length;
        if (onProgress) {
          onProgress(completed, nodesToEmbed.length);
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
