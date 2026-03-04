import 'dotenv/config';
import OpenAI from 'openai';
import { getEncoding } from 'js-tiktoken';
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

const MAX_TOKENS = 8191;

/**
 * Split text into chunks that fit within the token limit.
 * Splits on sentence boundaries to avoid cutting mid-sentence.
 */
function chunkText(text: string, maxTokens: number = MAX_TOKENS): string[] {
  const enc = getEncoding('cl100k_base');
  const tokens = enc.encode(text);

  if (tokens.length <= maxTokens) {
    return [text];
  }

  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = enc.encode(sentence).length;

    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      currentTokens = 0;
    }

    // If a single sentence exceeds the limit, add it as its own chunk (will be truncated by the API)
    if (sentenceTokens > maxTokens && !currentChunk) {
      chunks.push(sentence);
      continue;
    }

    currentChunk += (currentChunk ? ' ' : '') + sentence;
    currentTokens += sentenceTokens;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Average vectors component-wise, then L2-normalize the result.
 */
function meanPool(vectors: number[][]): number[] {
  if (vectors.length === 1) return vectors[0];

  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += vec[i];
    }
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
    norm += avg[i] * avg[i];
  }

  norm = Math.sqrt(norm);
  for (let i = 0; i < dim; i++) {
    avg[i] /= norm;
  }

  return avg;
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

      // Chunk all documents and build a flat list of chunks for batching
      const allChunks: { nodeId: string; text: string }[] = [];
      for (const node of nodesToEmbed) {
        const cleanBody = cleanTextForEmbedding(node.body);
        const fullText = `${node.title}\n\n${cleanBody}`;
        const chunks = chunkText(fullText);
        if (chunks.length > 1) {
          console.log(`  ${node.id}: split into ${chunks.length} chunks`);
        }
        for (const chunk of chunks) {
          allChunks.push({ nodeId: node.id, text: chunk });
        }
      }

      console.log(`Computing embeddings for ${nodesToEmbed.length} documents (${allChunks.length} chunks)...`);

      // Process chunks in batches of 100
      const batchSize = 100;
      const chunkEmbeddings: Map<string, number[][]> = new Map();
      let completed = 0;

      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        const texts = batch.map((c) => c.text);

        try {
          const response = await getClient().embeddings.create({
            model: modelName,
            input: texts,
          });

          for (let j = 0; j < response.data.length; j++) {
            const nodeId = batch[j].nodeId;
            if (!chunkEmbeddings.has(nodeId)) {
              chunkEmbeddings.set(nodeId, []);
            }
            chunkEmbeddings.get(nodeId)!.push(response.data[j].embedding);
          }
        } catch (error) {
          console.error(`Failed to compute embeddings for batch starting at ${i}:`, error);
          // Fall back to one-by-one for this batch
          for (const chunk of batch) {
            try {
              const response = await getClient().embeddings.create({
                model: modelName,
                input: chunk.text,
              });
              if (!chunkEmbeddings.has(chunk.nodeId)) {
                chunkEmbeddings.set(chunk.nodeId, []);
              }
              chunkEmbeddings.get(chunk.nodeId)!.push(response.data[0].embedding);
            } catch (err) {
              console.error(`Failed to compute embedding for chunk of ${chunk.nodeId}:`, err);
            }
          }
        }

        completed += batch.length;
        if (onProgress) {
          onProgress(completed, allChunks.length);
        }
      }

      // Mean-pool chunk embeddings into per-document embeddings
      for (const [nodeId, vectors] of chunkEmbeddings) {
        if (vectors.length > 0) {
          embeddings.set(nodeId, meanPool(vectors));
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
