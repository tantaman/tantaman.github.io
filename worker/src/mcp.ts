import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "./index";

interface Chunk {
  id: string;
  postTitle: string;
  postUrl: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

// Module-level cache for embeddings data
let cachedChunks: Chunk[] | null = null;

async function loadChunks(kv: KVNamespace): Promise<Chunk[]> {
  if (cachedChunks) return cachedChunks;

  const data = await kv.get("embeddings:all", "json");
  if (!data) throw new Error("Embeddings not found in KV");

  cachedChunks = data as Chunk[];
  return cachedChunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function createMcpServer(env: Env) {
  const server = new McpServer({
    name: "tantaman-blog",
    version: "1.0.0",
  });

  server.tool(
    "search_blog",
    "Search Matt Wonlaw's blog (tantaman.com) for relevant content. Returns passages from blog posts matching the query. Use this to answer questions about topics the blog covers, including CRDTs, local-first software, SQLite, distributed systems, and other technical topics.",
    { query: z.string().describe("The search query or question to find relevant blog content for") },
    async ({ query }) => {
      // Embed the query using Workers AI
      const queryEmbedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [query],
      }) as { data: number[][] };

      const queryVec = queryEmbedding.data[0];

      // Load chunks from KV
      const chunks = await loadChunks(env.EMBEDDINGS);

      // Compute similarities
      const scored = chunks.map((chunk) => ({
        chunk,
        score: cosineSimilarity(queryVec, chunk.embedding),
      }));

      // Sort by score descending, take top 8
      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, 8);

      // Format response
      const lines = [`Found ${topResults.length} relevant passages from the blog:\n`];

      for (let i = 0; i < topResults.length; i++) {
        const { chunk, score } = topResults[i];
        lines.push(
          `--- [${i + 1}] From "${chunk.postTitle}" (${chunk.postUrl}) [relevance: ${score.toFixed(3)}] ---`
        );
        lines.push(chunk.text);
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  return server;
}
