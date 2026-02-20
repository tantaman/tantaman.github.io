import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "./index";
import { embedText } from "./embeddings";

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

export function cosineSimilarity(a: number[], b: number[]): number {
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
      const queryVec = await embedText(env.AI, query);

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

  server.tool(
    "search_thoughts",
    "Search Matt Wonlaw's thoughts (short-form posts on tantaman.com) for relevant content. Returns thoughts matching the query via semantic search. Use this to find thoughts about topics like CRDTs, local-first software, SQLite, distributed systems, and other technical topics.",
    {
      query: z.string().describe("The search query or question to find relevant thoughts for"),
      topK: z.number().min(1).max(20).default(10).describe("Number of results to return (1-20, default 10)"),
    },
    async ({ query, topK }) => {
      const queryVec = await embedText(env.AI, query);

      const results = await env.VECTORIZE.query(queryVec, {
        topK,
        returnMetadata: "all",
      });

      if (results.matches.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No matching thoughts found." }],
        };
      }

      const ids = results.matches.map((m) => parseInt(m.id, 10));
      const placeholders = ids.map(() => "?").join(",");
      const rows = await env.DB.prepare(
        `SELECT id, body, timestamp, parent_id FROM thought WHERE id IN (${placeholders})`
      ).bind(...ids).all();

      const bodyById = new Map<number, { body: string; timestamp: number; parent_id: number | null }>();
      for (const r of rows.results) {
        bodyById.set(r.id as number, {
          body: r.body as string,
          timestamp: r.timestamp as number,
          parent_id: r.parent_id as number | null,
        });
      }

      const lines = [`Found ${results.matches.length} relevant thoughts:\n`];

      for (let i = 0; i < results.matches.length; i++) {
        const match = results.matches[i];
        const id = parseInt(match.id, 10);
        const thought = bodyById.get(id);
        const body = thought?.body ?? (match.metadata?.body as string) ?? "(body unavailable)";
        const timestamp = thought?.timestamp ?? (match.metadata?.timestamp as number);
        const date = timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : "unknown";

        lines.push(
          `--- [${i + 1}] Thought #${id} (${date}) [relevance: ${match.score.toFixed(3)}] ---`
        );
        lines.push(body);
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  return server;
}
