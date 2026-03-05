import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "./index";
import { embedText } from "./embeddings";
import { filterPosts, countFacetValues, tagId, type Post } from "@tantaman/facets";

interface Chunk {
  id: string;
  postTitle: string;
  postUrl: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

// Module-level caches
let cachedChunks: Chunk[] | null = null;

interface ManifestEntry {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  concern: string[];
  form: string;
  collection: string;
  color: string | null;
  sourceFile: string;
}

let cachedManifest: Post[] | null = null;
let cachedRawManifest: ManifestEntry[] | null = null;

async function fetchManifest(): Promise<ManifestEntry[]> {
  if (cachedRawManifest) return cachedRawManifest;

  const res = await fetch("https://tantaman.com/posts-manifest.json");
  if (!res.ok) throw new Error("Failed to fetch posts manifest");
  cachedRawManifest = await res.json();
  return cachedRawManifest!;
}

async function loadManifest(): Promise<Post[]> {
  if (cachedManifest) return cachedManifest;

  const data = await fetchManifest();

  cachedManifest = data.map((p) => ({
    title: p.title,
    url: p.slug.includes(".") ? p.slug : p.slug + ".html",
    date: p.date,
    description: p.summary || "",
    subjects: p.tags || [],
    concerns: p.concern || [],
    form: p.form || "essay",
    sentimentColor: p.color || undefined,
  }));

  return cachedManifest;
}

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
        `SELECT id, body, timestamp, parent_id FROM thought WHERE id IN (${placeholders}) AND superseded_by IS NULL`
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

  server.tool(
    "browse_posts",
    "Browse and filter blog posts by subject, concern, and form facets. Returns matching posts with facet counts. Use this to explore what topics the blog covers or find posts matching specific criteria.",
    {
      subjects: z.array(z.string()).optional().describe("Filter by subject tags, e.g. [\"software\", \"ai\"]. AND logic: posts must have all specified subjects."),
      concerns: z.array(z.string()).optional().describe("Filter by concern tags, e.g. [\"craft\"]. AND logic: posts must have all specified concerns."),
      forms: z.array(z.string()).optional().describe("Filter by form, e.g. [\"essay\"]. OR logic: posts can match any specified form."),
    },
    async ({ subjects, concerns, forms }) => {
      const allPosts = await loadManifest();

      const filters = {
        subject: subjects?.map((s) => tagId(s)),
        concern: concerns?.map((c) => tagId(c)),
        form: forms?.map((f) => tagId(f)),
      };

      const filtered = filterPosts(allPosts, filters);
      const counts = countFacetValues(filtered);

      const lines: string[] = [];
      lines.push(`Found ${filtered.length} posts matching filters.\n`);

      lines.push("## Facet counts (in filtered results):\n");
      lines.push("Subjects: " + Object.entries(counts.subject).map(([k, v]) => `${k} (${v})`).join(", "));
      lines.push("Concerns: " + Object.entries(counts.concern).map(([k, v]) => `${k} (${v})`).join(", "));
      lines.push("Forms: " + Object.entries(counts.form).map(([k, v]) => `${k} (${v})`).join(", "));
      lines.push("");

      lines.push("## Posts:\n");
      for (const p of filtered.slice(0, 50)) {
        lines.push(`- **${p.title}** (${p.date}) — https://tantaman.com/${p.url}`);
        if (p.description) lines.push(`  ${p.description.slice(0, 200)}`);
        lines.push(`  [${p.subjects.join(", ")}] [${p.concerns.join(", ")}] [${p.form}]`);
      }

      if (filtered.length > 50) {
        lines.push(`\n... and ${filtered.length - 50} more posts.`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  server.tool(
    "list_posts",
    "List blog posts by date range and sort order. Returns post URLs, titles, and raw GitHub markdown URLs so you can fetch source content.",
    {
      startDate: z.string().optional().describe("Inclusive start date in ISO format, e.g. \"2025-01-01\""),
      endDate: z.string().optional().describe("Inclusive end date in ISO format, e.g. \"2026-03-04\""),
      sort: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort by date ascending or descending (default desc)"),
    },
    async ({ startDate, endDate, sort }) => {
      const raw = await fetchManifest();

      let posts = raw;
      if (startDate) {
        posts = posts.filter((p) => p.date >= startDate);
      }
      if (endDate) {
        posts = posts.filter((p) => p.date <= endDate);
      }

      posts = [...posts].sort((a, b) =>
        sort === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
      );

      const lines: string[] = [];
      lines.push(`Found ${posts.length} posts.\n`);

      for (const p of posts) {
        const collectionPath = p.collection === "root" ? "" : p.collection;
        const url = `https://tantaman.com/${p.slug.includes(".") ? p.slug : p.slug + ".html"}`;
        const rawUrl = `https://raw.githubusercontent.com/tantaman/tantaman.github.io/refs/heads/master/content/${collectionPath}${p.sourceFile}`;
        lines.push(`- **${p.title}** (${p.date})`);
        lines.push(`  URL: ${url}`);
        lines.push(`  Source: ${rawUrl}`);
        if (p.summary) lines.push(`  Summary: ${p.summary}`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  return server;
}
