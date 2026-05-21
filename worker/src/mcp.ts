import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "./index";
import { embedText, classifyVectorId } from "./embeddings";
import { filterPosts, countFacetValues, tagId, type Post } from "@tantaman/facets";

interface ManifestEntry {
  slug: string;
  title: string;
  description: string;
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
    description: p.description || "",
    subjects: p.tags || [],
    concerns: p.concern || [],
    form: p.form || "essay",
    sentimentColor: p.color || undefined,
  }));

  return cachedManifest;
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

      // Vectorize index is shared across thoughts, pastes, amps, and blog
      // chunks. Over-query and filter to blog-prefixed IDs.
      const results = await env.VECTORIZE.query(queryVec, {
        topK: 40,
        returnMetadata: "all",
      });
      const blogMatches = results.matches
        .filter((m) => classifyVectorId(m.id).kind === "blog")
        .slice(0, 8);

      const lines = [`Found ${blogMatches.length} relevant passages from the blog:\n`];

      for (let i = 0; i < blogMatches.length; i++) {
        const m = blogMatches[i];
        const md = m.metadata ?? {};
        const title = (md.postTitle as string) ?? "(unknown)";
        const url = (md.postUrl as string) ?? "";
        const text = (md.text as string) ?? "(text unavailable)";
        lines.push(
          `--- [${i + 1}] From "${title}" (${url}) [relevance: ${m.score.toFixed(3)}] ---`
        );
        lines.push(text);
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

      // Vectorize index is shared; over-query and keep only thought hits.
      const results = await env.VECTORIZE.query(queryVec, {
        topK: topK * 4,
        returnMetadata: "all",
      });
      const thoughtMatches = results.matches
        .filter((m) => classifyVectorId(m.id).kind === "thought")
        .slice(0, topK);

      if (thoughtMatches.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No matching thoughts found." }],
        };
      }

      const ids = thoughtMatches.map((m) => parseInt(m.id, 10));
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

      const lines = [`Found ${thoughtMatches.length} relevant thoughts:\n`];

      for (let i = 0; i < thoughtMatches.length; i++) {
        const match = thoughtMatches[i];
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
        if (p.description) lines.push(`  Description: ${p.description}`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  server.tool(
    "wardrobe_archive",
    "Read Matt Wonlaw's full wardrobe archive — every clothing item under consideration, on the shortlist, currently owned, decided to keep, or already cut, plus named outfits showing how pieces get composed. Returns a markdown manifest with brand, status, price, facet tags (category/style/sleeve/season/fit/color), notes, source links, photo URLs, and a final outfits section. Each outfit lists its pieces by catalog number with the primary photo URL inline, followed by an `Outfit photos` block of all member photo URLs grouped together — ready to hand to an image model for virtual try-on or composition. The cut items are informative too — what was rejected reveals taste. Use this to suggest similar pieces, adjacent brands, items that would complete the set, or new outfit combinations.",
    {
      statuses: z
        .array(z.enum(["candidate", "shortlist", "keep", "own", "cut"]))
        .optional()
        .default(["own", "keep", "shortlist", "candidate", "cut"])
        .describe("Which statuses to include (default: everything)"),
    },
    async ({ statuses }) => {
      const placeholders = statuses.map(() => "?").join(",");
      const itemsQ = await env.DB
        .prepare(`SELECT id, name, brand, notes, facets, links, price_cents, status, rating FROM wardrobe_item WHERE user_id = 'me' AND status IN (${placeholders}) ORDER BY status ASC, json_extract(facets, '$.category') ASC, updated_at DESC`)
        .bind(...statuses)
        .all<{ id: number; name: string | null; brand: string | null; notes: string; facets: string; links: string; price_cents: number | null; status: string; rating: number | null }>();
      const items = itemsQ.results;
      if (items.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No wardrobe items with status ${statuses.join(", ")}.` }],
        };
      }

      const photoRows = await env.DB
        .prepare(`SELECT item_id, attachment_key FROM wardrobe_photo WHERE item_id IN (${items.map(() => "?").join(",")}) ORDER BY position ASC`)
        .bind(...items.map((i) => i.id))
        .all<{ item_id: number; attachment_key: string }>();
      const photosByItem = new Map<number, string[]>();
      for (const p of photoRows.results) {
        if (!photosByItem.has(p.item_id)) photosByItem.set(p.item_id, []);
        photosByItem.get(p.item_id)!.push(p.attachment_key);
      }

      const fmtPrice = (cents: number | null) =>
        cents == null ? null : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
      const stars = (r: number | null) => (r == null ? null : "★".repeat(r) + "☆".repeat(5 - r));

      const lines: string[] = [
        `# Wardrobe Archive`,
        ``,
        `${items.length} ${items.length === 1 ? "piece" : "pieces"} · statuses: ${statuses.join(", ")}`,
        ``,
      ];

      for (const row of items) {
        const facets = (() => { try { return JSON.parse(row.facets) as Record<string, string>; } catch { return {}; } })();
        const links = (() => { try { return JSON.parse(row.links) as { url: string; title?: string; price_cents?: number }[]; } catch { return []; } })();
        const photos = photosByItem.get(row.id) ?? [];

        lines.push(`## № ${String(row.id).padStart(3, "0")} · ${row.name || row.brand || "Untitled"}`);
        lines.push("");
        const meta: string[] = [`**Status:** ${row.status.toUpperCase()}`];
        if (row.brand) meta.push(`**Brand:** ${row.brand}`);
        const price = fmtPrice(row.price_cents);
        if (price) meta.push(`**Price:** ${price}`);
        const r = stars(row.rating);
        if (r) meta.push(`**Rating:** ${r}`);
        lines.push(meta.join("  \n"));
        lines.push("");

        const facetEntries = Object.entries(facets).filter(([, v]) => v);
        if (facetEntries.length > 0) {
          lines.push(facetEntries.map(([k, v]) => `**${k}:** ${v}`).join(" · "));
          lines.push("");
        }

        if (row.notes && row.notes.trim()) {
          lines.push(row.notes.trim());
          lines.push("");
        }

        if (links.length > 0) {
          lines.push(`**Sources:**`);
          for (const l of links) {
            const title = l.title || (() => { try { return new URL(l.url).hostname.replace(/^www\./, ""); } catch { return l.url; } })();
            const lp = fmtPrice(l.price_cents ?? null);
            lines.push(`- [${title}](${l.url})${lp ? ` — ${lp}` : ""}`);
          }
          lines.push("");
        }

        if (photos.length > 0) {
          lines.push(`**Photos:**`);
          for (const k of photos) lines.push(`- https://tantaman.com/api/attachments/${k}`);
          lines.push("");
        }
      }

      // Outfits — named combinations. Always included; member items are resolved
      // separately so outfits remain intact even when items are status-filtered.
      const outfitsQ = await env.DB
        .prepare("SELECT id, name, occasion, notes FROM wardrobe_outfit WHERE user_id = 'me' ORDER BY updated_at DESC")
        .all<{ id: number; name: string; occasion: string | null; notes: string }>();
      const outfits = outfitsQ.results;

      if (outfits.length > 0) {
        const memQ = await env.DB
          .prepare(`SELECT outfit_id, item_id, position FROM wardrobe_outfit_item WHERE outfit_id IN (${outfits.map(() => "?").join(",")}) ORDER BY position ASC`)
          .bind(...outfits.map((o) => o.id))
          .all<{ outfit_id: number; item_id: number; position: number }>();

        const knownById = new Map(items.map((i) => [i.id, i]));
        const memberIds = Array.from(new Set(memQ.results.map((m) => m.item_id)));
        const missingIds = memberIds.filter((id) => !knownById.has(id));
        const missingById = new Map<number, { id: number; name: string | null; brand: string | null; status: string }>();
        if (missingIds.length > 0) {
          const lookupQ = await env.DB
            .prepare(`SELECT id, name, brand, status FROM wardrobe_item WHERE id IN (${missingIds.map(() => "?").join(",")}) AND user_id = 'me'`)
            .bind(...missingIds)
            .all<{ id: number; name: string | null; brand: string | null; status: string }>();
          for (const r of lookupQ.results) missingById.set(r.id, r);
        }

        // Photos for every outfit member, position-ordered. Inlined per piece
        // so an LLM looking at one outfit can hand the URLs to an image model
        // (e.g. Gemini virtual try-on) without cross-referencing.
        const outfitPhotosByItem = new Map<number, string[]>();
        if (memberIds.length > 0) {
          const photoQ = await env.DB
            .prepare(`SELECT item_id, attachment_key FROM wardrobe_photo WHERE item_id IN (${memberIds.map(() => "?").join(",")}) ORDER BY position ASC`)
            .bind(...memberIds)
            .all<{ item_id: number; attachment_key: string }>();
          for (const p of photoQ.results) {
            if (!outfitPhotosByItem.has(p.item_id)) outfitPhotosByItem.set(p.item_id, []);
            outfitPhotosByItem.get(p.item_id)!.push(p.attachment_key);
          }
        }

        lines.push(`---`);
        lines.push("");
        lines.push(`# Outfits (${outfits.length})`);
        lines.push("");
        lines.push(`Named combinations — how individual pieces get composed into looks.`);
        lines.push("");

        for (const o of outfits) {
          lines.push(`## ${o.name}`);
          lines.push("");
          if (o.occasion) {
            lines.push(`**Occasion:** ${o.occasion}`);
            lines.push("");
          }
          if (o.notes && o.notes.trim()) {
            lines.push(o.notes.trim());
            lines.push("");
          }
          const members = memQ.results
            .filter((m) => m.outfit_id === o.id)
            .sort((a, b) => a.position - b.position);
          if (members.length > 0) {
            lines.push(`**Pieces:**`);
            const outfitUrls: string[] = [];
            for (const m of members) {
              const k = knownById.get(m.item_id);
              const x = k ?? missingById.get(m.item_id);
              if (!x) continue;
              const heading = x.name || x.brand || "Untitled";
              const keys = outfitPhotosByItem.get(m.item_id) ?? [];
              const primary = keys[0];
              const primaryUrl = primary ? `https://tantaman.com/api/attachments/${primary}` : null;
              lines.push(`- № ${String(x.id).padStart(3, "0")} · ${heading} _(${x.status.toUpperCase()})_${primaryUrl ? ` — ${primaryUrl}` : ""}`);
              for (const key of keys) outfitUrls.push(`https://tantaman.com/api/attachments/${key}`);
            }
            lines.push("");
            if (outfitUrls.length > 0) {
              lines.push(`**Outfit photos:**`);
              for (const u of outfitUrls) lines.push(`- ${u}`);
              lines.push("");
            }
          }
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  server.tool(
    "list_thoughts",
    "Browse Matt Wonlaw's thoughts (short-form posts) chronologically. Supports date range filtering and pagination. Returns full thought body content inline.",
    {
      startDate: z.string().optional().describe("Inclusive start date in ISO format, e.g. \"2025-01-01\""),
      endDate: z.string().optional().describe("Inclusive end date in ISO format, e.g. \"2026-03-04\""),
      sort: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort by date ascending or descending (default desc)"),
      limit: z.number().min(1).max(50).optional().default(20).describe("Number of thoughts to return (1-50, default 20)"),
      offset: z.number().min(0).optional().default(0).describe("Offset for pagination (default 0)"),
    },
    async ({ startDate, endDate, sort, limit, offset }) => {
      const conditions = ["superseded_by IS NULL", "private = 0", "parent_id IS NULL"];
      const binds: (string | number)[] = [];

      if (startDate) {
        conditions.push("timestamp >= ?");
        binds.push(Math.floor(new Date(startDate).getTime() / 1000));
      }
      if (endDate) {
        conditions.push("timestamp <= ?");
        binds.push(Math.floor(new Date(endDate + "T23:59:59Z").getTime() / 1000));
      }

      const sql = `SELECT id, body, timestamp FROM thought WHERE ${conditions.join(" AND ")} ORDER BY timestamp ${sort === "asc" ? "ASC" : "DESC"} LIMIT ? OFFSET ?`;
      binds.push(limit, offset);

      const rows = await env.DB.prepare(sql).bind(...binds).all();

      if (rows.results.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No thoughts found for the given criteria." }],
        };
      }

      const lines = [`Found ${rows.results.length} thoughts (offset ${offset}).\n`];

      for (const r of rows.results) {
        const date = new Date((r.timestamp as number) * 1000).toISOString().slice(0, 10);
        lines.push(`--- Thought #${r.id} (${date}) ---`);
        lines.push(r.body as string);
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );

  return server;
}
