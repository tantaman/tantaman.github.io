import { Hono } from "hono";
import { cors } from "hono/cors";
import { StreamableHTTPTransport } from "@hono/mcp";
import { ZodError } from "zod";
import { extractEvents } from "./events";
import { generateICS } from "./ical";
import { extractTasks } from "./tasks";
import { extractLocations, geocodeLocation } from "./locations";
import { extractMovies, normalizeMovieTitle } from "./movies";
import { lookupMovie, fetchMovieById } from "./tmdb";
import { lookupAlbum, fetchAlbumById } from "./itunes";
import { extractAlbums, normalizeAlbumTitle } from "./albums";
import { extractBooks } from "./books";
import { extractQuestions } from "./questions";
import { lookupBook, fetchBookByKey } from "./openlibrary";
import { extractBookmarks } from "./bookmarks";
import { fetchOgMetadata } from "./opengraph";
import { extractTags } from "./tags";
import { extractThoughtLinks } from "./thought-links";
import { createMcpServer } from "./mcp";
import { embedText, upsertThoughtEmbedding, deleteThoughtEmbeddings, upsertPasteEmbedding, upsertAmplificationEmbedding, classifyVectorId, chunkPasteBody } from "./embeddings";
import { hashBody, attachDuplicateIds } from "./body-hash";
import { dha } from "./dha";
import { posts } from "./posts";
import { comments } from "./comments";
import { igCard } from "./ig-card";
import { paste } from "./paste";
import { lists } from "./lists";
import { now } from "./now";
import { sendDigest } from "./digest";
import { thoughtOg } from "./thought-og";
import { amplifications } from "./amplifications";
import { clusters, assignClusters, removeClusterMembership, scheduleBackground } from "./clusters";
import {
  CreateThoughtBody,
  UpdateTaskBody,
  CreateFramingBody,
  UpdateFramingBody,
  PlaceNodeBody,
  UpdateNodeBody,
  CreateEdgeBody,
  UpdateEdgeBody,
  BatchUpdateBody,
  ImportFramingBody,
  CreatePostBody,
  UpdatePostBody,
  LikeBody,
  RequestOtpBody,
  VerifyOtpBody,
  CreateCommentBody,
  UpdateMovieBody,
  UpdateBookBody,
  UpdateAlbumBody,
  UpdateQuestionBody,
  CreateCanvasBody,
  UpdateCanvasBody,
} from "./schemas";

export interface Env {
  AI: Ai;
  KV: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  AUDIO_BUCKET: R2Bucket;
  VECTORIZE: Vectorize;
  THOUGHT_SECRET: string;
  DHA_SECRET: string;
  MAPBOX_TOKEN: string;
  TMDB_API_KEY: string;
  RESEND_API_KEY: string;
  DIGEST_EMAIL_TO: string;
  ICAL_TOKEN: string;
  TTS_WORKFLOW: Workflow;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isAuthed(c: { req: { header: (name: string) => string | undefined }; env: { THOUGHT_SECRET: string } }): boolean {
  const auth = c.req.header("Authorization");
  return auth === `Bearer ${c.env.THOUGHT_SECRET}`;
}

async function getVersion(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT counter FROM version WHERE id = 1").first<{ counter: number }>();
  return row?.counter ?? 0;
}

async function bumpVersion(db: D1Database): Promise<void> {
  await db.prepare("UPDATE version SET counter = counter + 1 WHERE id = 1").run();
}

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: err.issues[0].message }, 400);
  }
  throw err;
});

app.use("*", cors());

// --- API sub-app ---
const api = new Hono<{ Bindings: Env }>();

// Auto-bump version after any successful mutation
api.use("*", async (c, next) => {
  await next();
  if (c.req.method !== "GET" && c.res.ok) {
    await bumpVersion(c.env.DB);
  }
});

// ETag / 304 Not Modified for GET requests
api.use("*", async (c, next) => {
  if (c.req.method !== "GET") {
    return next();
  }

  // Skip non-API routes (attachments have their own cache headers, MCP is not cacheable)
  const path = c.req.path;
  if (path.startsWith("/api/attachments/") || path.startsWith("/api/dha/") || path.startsWith("/api/comments/") || path.startsWith("/api/ig-card/") || path === "/api/events.ics" || path === "/api/mcp" || path === "/api" || path === "/api/") {
    return next();
  }

  const version = await getVersion(c.env.DB);
  const authed = isAuthed(c);
  const etag = `"${authed ? 'a' : 'p'}-${version}"`;
  const ifNoneMatch = c.req.header("If-None-Match");

  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }

  await next();

  c.res.headers.set("ETag", etag);
  c.res.headers.set("Cache-Control", "private, no-cache");
});

api.all("/mcp", async (c) => {
  const server = createMcpServer(c.env);
  const transport = new StreamableHTTPTransport();

  await server.connect(transport);
  return transport.handleRequest(c);
});

api.get("/", (c) => {
  return c.json({
    name: "tantaman-api",
    description: "API for tantaman.com blog, including MCP server for AI-assisted search",
    mcp: "/api/mcp",
  });
});

api.get("/thoughts/search", async (c) => {
  const query = c.req.query("q");
  if (!query) {
    return c.json({ error: "Missing q parameter" }, 400);
  }

  const authed = isAuthed(c);

  const queryVec = await embedText(c.env.AI, query);
  const vecResults = await c.env.VECTORIZE.query(queryVec, {
    topK: 20,
    returnMetadata: "all",
  });

  if (vecResults.matches.length === 0) {
    return c.json({ thoughts: [] });
  }

  // Filter out non-thought matches (pastes and amplifications share the same Vectorize index).
  const thoughtMatches = vecResults.matches.filter((m) => /^\d+$/.test(m.id));
  if (thoughtMatches.length === 0) {
    return c.json({ thoughts: [] });
  }
  const ids = thoughtMatches.map((m) => parseInt(m.id, 10));
  const scoreById = new Map(
    thoughtMatches.map((m) => [parseInt(m.id, 10), m.score])
  );

  const placeholders = ids.map(() => "?").join(",");
  const privateFilter = authed ? "" : " AND t.private = 0";
  const replyPrivateFilter = authed ? "" : " AND r.private = 0";
  const results = await c.env.DB.prepare(
    `SELECT t.id, t.body, t.body_hash, t.timestamp, t.created_at, t.parent_id, t.color, t.private, t.version_of, t.superseded_by,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id${replyPrivateFilter}) AS reply_count
     FROM thought t
     WHERE t.id IN (${placeholders}) AND t.superseded_by IS NULL${privateFilter}`
  ).bind(...ids).all();

  const thoughts = results.results as Record<string, unknown>[];

  if (thoughts.length > 0) {
    const tIds = thoughts.map((t) => t.id);
    const aPlaceholders = tIds.map(() => "?").join(",");
    const attachments = await c.env.DB.prepare(
      `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id IN (${aPlaceholders})`
    ).bind(...tIds).all();

    const byThought = new Map<number, { key: string; type: string; name: string }[]>();
    for (const a of attachments.results) {
      const tid = a.thought_id as number;
      if (!byThought.has(tid)) byThought.set(tid, []);
      byThought.get(tid)!.push({
        key: a.attachment_key as string,
        type: a.attachment_type as string,
        name: a.attachment_name as string,
      });
    }

    for (const t of thoughts) {
      t.attachments = byThought.get(t.id as number) || [];
      t.score = scoreById.get(t.id as number) || 0;
    }

    await attachDuplicateIds(c.env.DB, thoughts, authed);
  }

  thoughts.sort((a, b) => (b.score as number) - (a.score as number));

  return c.json({ thoughts });
});

// Unified semantic search across thoughts, pastes (latest fork only), and amplifications.
api.get("/search", async (c) => {
  const query = c.req.query("q");
  if (!query) {
    return c.json({ error: "Missing q parameter" }, 400);
  }

  const authed = isAuthed(c);
  const queryVec = await embedText(c.env.AI, query);
  const vecResults = await c.env.VECTORIZE.query(queryVec, {
    topK: 50,
    returnMetadata: "all",
  });

  const thoughtMatches: { id: number; score: number }[] = [];
  const pasteBestByRef = new Map<string, { id: string; score: number; chunk: number }>();
  const ampMatches: { id: number; score: number }[] = [];

  for (const m of vecResults.matches) {
    const { kind, ref, chunk } = classifyVectorId(m.id);
    if (kind === "thought") {
      const n = parseInt(ref, 10);
      if (!Number.isNaN(n)) thoughtMatches.push({ id: n, score: m.score });
    } else if (kind === "paste") {
      // Dedup chunks: keep the best-scoring chunk per paste.
      const existing = pasteBestByRef.get(ref);
      if (!existing || m.score > existing.score) {
        pasteBestByRef.set(ref, { id: ref, score: m.score, chunk: chunk ?? 0 });
      }
    } else if (kind === "amplification") {
      const n = parseInt(ref, 10);
      if (!Number.isNaN(n)) ampMatches.push({ id: n, score: m.score });
    }
  }
  const pasteMatches = [...pasteBestByRef.values()];

  const [thoughts, pastes, amplifications] = await Promise.all([
    fetchThoughtsForSearch(c.env.DB, thoughtMatches, authed),
    fetchPastesForSearch(c.env.DB, pasteMatches, authed),
    fetchAmplificationsForSearch(c.env.DB, ampMatches),
  ]);

  return c.json({ thoughts, pastes, amplifications });
});

async function fetchThoughtsForSearch(
  db: D1Database,
  matches: { id: number; score: number }[],
  authed: boolean,
): Promise<Record<string, unknown>[]> {
  if (matches.length === 0) return [];
  const ids = matches.map((m) => m.id);
  const scoreById = new Map(matches.map((m) => [m.id, m.score]));
  const placeholders = ids.map(() => "?").join(",");
  const privateFilter = authed ? "" : " AND t.private = 0";
  const replyPrivateFilter = authed ? "" : " AND r.private = 0";

  const results = await db.prepare(
    `SELECT t.id, t.body, t.body_hash, t.timestamp, t.created_at, t.parent_id, t.color, t.private, t.version_of, t.superseded_by,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id${replyPrivateFilter}) AS reply_count
     FROM thought t
     WHERE t.id IN (${placeholders}) AND t.superseded_by IS NULL${privateFilter}`
  ).bind(...ids).all();

  const thoughts = results.results as Record<string, unknown>[];
  if (thoughts.length === 0) return [];

  const tIds = thoughts.map((t) => t.id as number);
  const aPlaceholders = tIds.map(() => "?").join(",");
  const attachments = await db.prepare(
    `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id IN (${aPlaceholders})`
  ).bind(...tIds).all();

  const byThought = new Map<number, { key: string; type: string; name: string }[]>();
  for (const a of attachments.results) {
    const tid = a.thought_id as number;
    if (!byThought.has(tid)) byThought.set(tid, []);
    byThought.get(tid)!.push({
      key: a.attachment_key as string,
      type: a.attachment_type as string,
      name: a.attachment_name as string,
    });
  }

  for (const t of thoughts) {
    t.attachments = byThought.get(t.id as number) || [];
    t.score = scoreById.get(t.id as number) || 0;
  }

  await attachDuplicateIds(db, thoughts, authed);
  thoughts.sort((a, b) => (b.score as number) - (a.score as number));
  return thoughts;
}

async function fetchPastesForSearch(
  db: D1Database,
  matches: { id: string; score: number; chunk: number }[],
  authed: boolean,
): Promise<Record<string, unknown>[]> {
  if (matches.length === 0) return [];
  const ids = matches.map((m) => m.id);
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const placeholders = ids.map(() => "?").join(",");
  const sharedFilter = authed ? "" : " AND p.shared = 1";

  // Fetch full body so we can re-chunk and return the matching chunk as preview.
  const results = await db.prepare(
    `SELECT p.id, p.title, p.language, p.shared, p.created_at, p.body
     FROM paste p
     WHERE p.id IN (${placeholders}) AND NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id)${sharedFilter}`
  ).bind(...ids).all<{
    id: string;
    title: string | null;
    language: string;
    shared: number;
    created_at: number;
    body: string;
  }>();

  const pastes = results.results.map((p) => {
    const match = matchById.get(p.id);
    const score = match?.score ?? 0;
    const chunkIdx = match?.chunk ?? 0;
    const chunks = chunkPasteBody(p.title, p.body);
    const snippet = chunks[chunkIdx] ?? chunks[0] ?? p.body.slice(0, 300);
    return {
      id: p.id,
      title: p.title,
      language: p.language,
      shared: p.shared,
      created_at: p.created_at,
      body_preview: snippet.slice(0, 500),
      score,
    };
  });

  pastes.sort((a, b) => b.score - a.score);
  return pastes as unknown as Record<string, unknown>[];
}

async function fetchAmplificationsForSearch(
  db: D1Database,
  matches: { id: number; score: number }[],
): Promise<Record<string, unknown>[]> {
  if (matches.length === 0) return [];
  const ids = matches.map((m) => m.id);
  const scoreById = new Map(matches.map((m) => [m.id, m.score]));
  const placeholders = ids.map(() => "?").join(",");

  const results = await db.prepare(
    `SELECT id, url, source, note, title, image_url, description, site_name, created_at
     FROM amplification WHERE id IN (${placeholders})`
  ).bind(...ids).all();

  const amps = results.results as Record<string, unknown>[];
  for (const a of amps) {
    a.score = scoreById.get(a.id as number) || 0;
  }
  amps.sort((a, b) => (b.score as number) - (a.score as number));
  return amps;
}

// Backfill embeddings for existing leaf pastes and amplifications. One-shot after deploy.
api.post("/search/backfill", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const kind = c.req.query("kind") ?? "all";
  let pastesEmbedded = 0;
  let ampsEmbedded = 0;

  if (kind === "all" || kind === "pastes") {
    const pastes = await c.env.DB.prepare(
      `SELECT p.id, p.title, p.body, p.created_at FROM paste p
       WHERE NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id)`
    ).all<{ id: string; title: string | null; body: string; created_at: number }>();

    for (const p of pastes.results) {
      await upsertPasteEmbedding(c.env, p.id, p.title, p.body, p.created_at);
      pastesEmbedded++;
    }
  }

  if (kind === "all" || kind === "amplifications") {
    const amps = await c.env.DB.prepare(
      "SELECT id, title, description, note, created_at FROM amplification"
    ).all<{ id: number; title: string | null; description: string | null; note: string | null; created_at: number }>();

    for (const a of amps.results) {
      await upsertAmplificationEmbedding(c.env, a.id, a.title, a.description, a.note, a.created_at);
      ampsEmbedded++;
    }
  }

  return c.json({ pastes: pastesEmbedded, amplifications: ampsEmbedded });
});

api.get("/thoughts/graph", async (c) => {
  const authed = isAuthed(c);
  const privateFilter = authed ? "" : " AND t.private = 0";
  const replyPrivateFilter = authed ? "" : " AND r.private = 0";

  const results = await c.env.DB.prepare(
    `SELECT t.id, t.body, t.timestamp, t.created_at, t.color, t.private, t.version_of, t.superseded_by,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id${replyPrivateFilter}) AS reply_count
     FROM thought t
     WHERE t.parent_id IS NULL AND t.superseded_by IS NULL${privateFilter}
     ORDER BY t.timestamp DESC`
  ).all<{ id: number; body: string; timestamp: number; created_at: string; color: string | null; private: number; version_of: number | null; superseded_by: number | null; reply_count: number }>();

  const thoughts = results.results;
  if (thoughts.length === 0) {
    return c.json({ thoughts: [], clusters: [] });
  }

  // Primary cluster per thought (rank=0 row from cluster_membership).
  // Fetch all rank-0 memberships and intersect in memory — D1 caps prepared-statement
  // variables around 100, so an IN (?,?,...) with hundreds of ids would 500.
  const memRows = await c.env.DB.prepare(
    `SELECT CAST(item_id AS INTEGER) AS id, cluster_id
     FROM cluster_membership
     WHERE item_kind = 'thought' AND rank = 0`
  ).all<{ id: number; cluster_id: number }>();
  const clusterIdByThought = new Map<number, number>();
  for (const r of memRows.results) clusterIdByThought.set(r.id, r.cluster_id);

  // Positions from KV (graph:positions), keyed by `thought:{id}`.
  let positions: Record<string, [number, number]> = {};
  const rawPositions = await c.env.KV.get("graph:positions");
  if (rawPositions) {
    try {
      const parsed = JSON.parse(rawPositions) as { positions: Record<string, [number, number]> };
      positions = parsed.positions ?? {};
    } catch {
      // ignore
    }
  }

  const withCoords = thoughts.map((t) => {
    const pos = positions[`thought:${t.id}`];
    return {
      ...t,
      x: pos ? pos[0] : null,
      y: pos ? pos[1] : null,
      cluster_id: clusterIdByThought.get(t.id) ?? null,
    };
  });

  const clusterRows = await c.env.DB.prepare(
    "SELECT id, label, size FROM cluster ORDER BY size DESC"
  ).all<{ id: number; label: string; size: number }>();

  return c.json({ thoughts: withCoords, clusters: clusterRows.results });
});

api.get("/thoughts", async (c) => {
  const limitParam = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offsetParam = parseInt(c.req.query("offset") || "0", 10) || 0;
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];
  const framingParam = c.req.query("framing");
  const framingId = framingParam ? parseInt(framingParam, 10) : null;
  const authed = isAuthed(c);
  const privateFilter = authed ? "" : " AND t.private = 0";
  const replyPrivateFilter = authed ? "" : " AND r.private = 0";

  let extraWhere = "";
  const binds: unknown[] = [];

  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    extraWhere += ` AND t.id IN (
      SELECT tt.thought_id FROM thought_tag tt
      JOIN tag tg ON tg.id = tt.tag_id
      WHERE tg.name IN (${placeholders})
      GROUP BY tt.thought_id
      HAVING COUNT(DISTINCT tg.name) = ?
    )`;
    binds.push(...tags, tags.length);
  }

  if (framingId != null) {
    extraWhere += ` AND t.id IN (SELECT CAST(fn.item_id AS INTEGER) FROM framing_node fn WHERE fn.framing_id = ? AND fn.node_type = 'thought')`;
    binds.push(framingId);
  }

  binds.push(limitParam, offsetParam);

  const results = await c.env.DB.prepare(
    `SELECT t.id, t.body, t.body_hash, t.timestamp, t.created_at, t.color, t.private, t.version_of, t.superseded_by,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id${replyPrivateFilter}) AS reply_count
     FROM thought t
     WHERE t.parent_id IS NULL AND t.superseded_by IS NULL${privateFilter}${extraWhere}
     ORDER BY t.timestamp DESC LIMIT ? OFFSET ?`
  ).bind(...binds).all();

  const hasMore = results.results.length === limitParam;

  const thoughts = results.results as Record<string, unknown>[];
  if (thoughts.length > 0) {
    const ids = thoughts.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(",");
    const attachments = await c.env.DB.prepare(
      `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id IN (${placeholders})`
    ).bind(...ids).all();

    const byThought = new Map<number, { key: string; type: string; name: string }[]>();
    for (const a of attachments.results) {
      const tid = a.thought_id as number;
      if (!byThought.has(tid)) byThought.set(tid, []);
      byThought.get(tid)!.push({
        key: a.attachment_key as string,
        type: a.attachment_type as string,
        name: a.attachment_name as string,
      });
    }

    for (const t of thoughts) {
      t.attachments = byThought.get(t.id as number) || [];
    }

    await attachDuplicateIds(c.env.DB, thoughts, authed);
  }

  return c.json({
    thoughts,
    meta: { limit: limitParam, offset: offsetParam, hasMore },
  });
});

api.get("/thoughts/tags", async (c) => {
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];
  const authed = isAuthed(c);
  const privateFilter = authed ? "" : " AND th.private = 0";

  let results;
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    results = await c.env.DB.prepare(
      `SELECT tg.name, COUNT(DISTINCT tt.thought_id) AS count
       FROM tag tg
       JOIN thought_tag tt ON tt.tag_id = tg.id
       JOIN thought th ON th.id = tt.thought_id AND th.parent_id IS NULL AND th.superseded_by IS NULL${privateFilter}
       WHERE tt.thought_id IN (
         SELECT tt2.thought_id FROM thought_tag tt2
         JOIN tag tg2 ON tg2.id = tt2.tag_id
         WHERE tg2.name IN (${placeholders})
         GROUP BY tt2.thought_id
         HAVING COUNT(DISTINCT tg2.name) = ?
       )
       GROUP BY tg.id
       ORDER BY count DESC`
    ).bind(...tags, tags.length).all();
  } else {
    results = await c.env.DB.prepare(
      `SELECT t.name, COUNT(tt.thought_id) AS count
       FROM tag t
       JOIN thought_tag tt ON tt.tag_id = t.id
       JOIN thought th ON th.id = tt.thought_id AND th.parent_id IS NULL AND th.superseded_by IS NULL${privateFilter}
       GROUP BY t.id
       ORDER BY count DESC`
    ).all();
  }

  return c.json({ tags: results.results });
});

api.get("/thoughts/:id/replies", async (c) => {
  const parentId = c.req.param("id");
  const authed = isAuthed(c);
  const replyPrivateFilter = authed ? "" : " AND r.private = 0";

  // Fetch parent thought
  const parentRow = await c.env.DB.prepare(
    `SELECT t.id, t.parent_id, t.body, t.body_hash, t.timestamp, t.created_at, t.color, t.private, t.version_of, t.superseded_by,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id${replyPrivateFilter}) AS reply_count
     FROM thought t
     WHERE t.id = ?`
  ).bind(parentId).first();

  if (!parentRow) {
    return c.json({ error: "Thought not found" }, 404);
  }

  if (!authed && (parentRow as Record<string, unknown>).private) {
    return c.json({ error: "Thought not found" }, 404);
  }

  const parent = parentRow as Record<string, unknown>;

  // Fetch parent attachments
  const parentAttachments = await c.env.DB.prepare(
    `SELECT thought_id, attachment_key, attachment_type, attachment_name FROM thought_attachment WHERE thought_id = ?`
  ).bind(parentId).all();
  parent.attachments = parentAttachments.results.map((a) => ({
    key: a.attachment_key as string,
    type: a.attachment_type as string,
    name: a.attachment_name as string,
  }));

  // Fetch all descendants recursively with attachments via LEFT JOIN
  const privateFilterCte = authed ? "" : " AND private = 0";
  const privateFilterJoin = authed ? "" : " AND t.private = 0";
  const results = await c.env.DB.prepare(
    `WITH RECURSIVE descendants(id, parent_id, body, body_hash, timestamp, created_at, color, private, depth) AS (
       SELECT id, parent_id, body, body_hash, timestamp, created_at, color, private, 0
       FROM thought WHERE parent_id = ?${privateFilterCte}
       UNION ALL
       SELECT t.id, t.parent_id, t.body, t.body_hash, t.timestamp, t.created_at, t.color, t.private, d.depth + 1
       FROM thought t JOIN descendants d ON t.parent_id = d.id${privateFilterJoin}
     )
     SELECT d.id, d.parent_id, d.body, d.body_hash, d.timestamp, d.created_at, d.color, d.private, d.depth,
       (SELECT COUNT(*) FROM thought r WHERE r.parent_id = d.id${replyPrivateFilter}) AS reply_count,
       ta.attachment_key, ta.attachment_type, ta.attachment_name
     FROM descendants d
     LEFT JOIN thought_attachment ta ON ta.thought_id = d.id
     ORDER BY d.depth ASC, d.timestamp ASC`
  ).bind(parentId).all();

  // Group rows by thought id — a thought with N attachments produces N rows
  const replyMap = new Map<number, Record<string, unknown>>();
  for (const row of results.results) {
    const r = row as Record<string, unknown>;
    const tid = r.id as number;
    if (!replyMap.has(tid)) {
      replyMap.set(tid, {
        id: r.id, parent_id: r.parent_id, body: r.body, body_hash: r.body_hash, timestamp: r.timestamp,
        created_at: r.created_at, color: r.color, private: r.private, depth: r.depth,
        reply_count: r.reply_count, attachments: [],
      });
    }
    if (r.attachment_key) {
      (replyMap.get(tid)!.attachments as { key: string; type: string; name: string }[]).push({
        key: r.attachment_key as string,
        type: r.attachment_type as string,
        name: r.attachment_name as string,
      });
    }
  }
  const replies = Array.from(replyMap.values());

  await attachDuplicateIds(c.env.DB, [parent, ...replies], authed);

  // Fetch version chain if this thought is part of one
  const versionRoot = (parent.version_of as number | null) ?? (parent.id as number);
  const versionRows = await c.env.DB.prepare(
    `SELECT id, timestamp FROM thought
     WHERE id = ? OR version_of = ?
     ORDER BY id ASC`
  ).bind(versionRoot, versionRoot).all();

  const versions = versionRows.results.length > 1
    ? versionRows.results.map((r) => ({ id: r.id as number, timestamp: r.timestamp as number }))
    : [];

  // Fetch ancestor chain (root → immediate parent) so direct-linked replies have context.
  // The recursive walk stops at private ancestors for non-authed callers, breaking the chain.
  let ancestors: Record<string, unknown>[] = [];
  const directParentId = parent.parent_id as number | null;
  if (directParentId != null) {
    const ancestorPrivateFilter = authed ? "" : " AND private = 0";
    const ancestorJoinFilter = authed ? "" : " AND t.private = 0";
    const ancestorRows = await c.env.DB.prepare(
      `WITH RECURSIVE ancestors(id, parent_id, body, timestamp, color, private, depth) AS (
         SELECT id, parent_id, body, timestamp, color, private, 0
         FROM thought WHERE id = ?${ancestorPrivateFilter}
         UNION ALL
         SELECT t.id, t.parent_id, t.body, t.timestamp, t.color, t.private, a.depth + 1
         FROM thought t JOIN ancestors a ON t.id = a.parent_id${ancestorJoinFilter}
       )
       SELECT id, parent_id, body, timestamp, color, private, depth
       FROM ancestors ORDER BY depth DESC`
    ).bind(directParentId).all();
    ancestors = ancestorRows.results.map((r) => ({
      id: r.id, parent_id: r.parent_id, body: r.body, timestamp: r.timestamp,
      color: r.color, private: r.private,
    }));
  }

  return c.json({ parent, replies, versions, ancestors });
});

// Related thoughts: explicit [[id]] links (in/out) + embedding-based "similar"
api.get("/thoughts/:id/related", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (!Number.isFinite(id)) return c.json({ error: "bad id" }, 400);
  const authed = isAuthed(c);
  const privateFilter = authed ? "" : " AND t.private = 0";

  const sourceRow = await c.env.DB.prepare(
    "SELECT id, version_of, private FROM thought WHERE id = ?"
  ).bind(id).first<{ id: number; version_of: number | null; private: number }>();
  if (!sourceRow) return c.json({ error: "Thought not found" }, 404);
  if (!authed && sourceRow.private) return c.json({ error: "Thought not found" }, 404);

  const versionRoot = sourceRow.version_of ?? sourceRow.id;

  const [outboundRes, inboundRes] = await Promise.all([
    c.env.DB.prepare(
      `SELECT t.id, t.body, t.timestamp, t.color
       FROM thought_edge e JOIN thought t ON t.id = e.target_id
       WHERE e.source_id = ? AND t.superseded_by IS NULL${privateFilter}`
    ).bind(id).all<{ id: number; body: string; timestamp: number; color: string | null }>(),
    c.env.DB.prepare(
      `SELECT t.id, t.body, t.timestamp, t.color
       FROM thought_edge e JOIN thought t ON t.id = e.source_id
       WHERE e.target_id = ? AND t.superseded_by IS NULL${privateFilter}
       ORDER BY t.timestamp DESC`
    ).bind(id).all<{ id: number; body: string; timestamp: number; color: string | null }>(),
  ]);

  const outbound = outboundRes.results;
  const inbound = inboundRes.results;
  const explicitIds = new Set<number>([
    ...outbound.map((r) => r.id),
    ...inbound.map((r) => r.id),
  ]);

  const similar: { id: number; body: string; timestamp: number; color: string | null; score: number }[] = [];
  try {
    const got = await c.env.VECTORIZE.getByIds([String(id)]);
    const vec = got[0]?.values as number[] | undefined;
    if (vec && vec.length > 0) {
      const queryRes = await c.env.VECTORIZE.query(vec, { topK: 30 });
      const candidateIds: number[] = [];
      for (const m of queryRes.matches) {
        if (classifyVectorId(m.id).kind !== "thought") continue;
        const cid = parseInt(m.id, 10);
        if (cid === id || explicitIds.has(cid)) continue;
        candidateIds.push(cid);
        if (candidateIds.length >= 20) break;
      }
      if (candidateIds.length > 0) {
        const placeholders = candidateIds.map(() => "?").join(",");
        const rows = await c.env.DB.prepare(
          `SELECT t.id, t.body, t.timestamp, t.color, t.version_of
           FROM thought t
           WHERE t.id IN (${placeholders}) AND t.superseded_by IS NULL${privateFilter}`
        ).bind(...candidateIds).all<{ id: number; body: string; timestamp: number; color: string | null; version_of: number | null }>();
        const rowById = new Map(rows.results.map((r) => [r.id, r]));
        const scoreById = new Map<number, number>();
        for (const m of queryRes.matches) {
          const cid = parseInt(m.id, 10);
          if (!scoreById.has(cid)) scoreById.set(cid, m.score);
        }
        for (const cid of candidateIds) {
          const r = rowById.get(cid);
          if (!r) continue;
          const root = r.version_of ?? r.id;
          if (root === versionRoot) continue;
          similar.push({
            id: r.id,
            body: r.body,
            timestamp: r.timestamp,
            color: r.color,
            score: scoreById.get(cid) ?? 0,
          });
          if (similar.length >= 5) break;
        }
      }
    }
  } catch (e) {
    console.error("similar lookup failed:", e);
  }

  return c.json({ outbound, inbound, similar });
});

api.post("/thoughts", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let trimmed: string;
  let files: File[] = [];
  let parentId: number | null = null;
  let versionOf: number | null = null;
  let isPrivate = false;

  const contentType = c.req.header("Content-Type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    trimmed = ((formData.get("body") as string) || "").trim();
    files = (formData.getAll("file") as unknown as (string | File)[]).filter((f): f is File => typeof f !== "string");
    const parentIdStr = formData.get("parent_id") as string | null;
    if (parentIdStr) parentId = parseInt(parentIdStr, 10);
    const versionOfStr = formData.get("version_of") as string | null;
    if (versionOfStr) versionOf = parseInt(versionOfStr, 10);
    isPrivate = formData.get("private") === "true";
  } else {
    const json = CreateThoughtBody.parse(await c.req.json());
    trimmed = (json.body || "").trim();
    if (json.parent_id != null) parentId = json.parent_id;
    if (json.version_of != null) versionOf = json.version_of;
    if (json.private) isPrivate = true;
  }

  if (!trimmed) {
    return c.json({ error: "Body must be non-empty" }, 400);
  }

  if (parentId != null && versionOf != null) {
    return c.json({ error: "Cannot set both parent_id and version_of" }, 400);
  }

  // Resolve version chain
  let resolvedVersionOf: number | null = null;
  let previousLatestId: number | null = null;
  if (versionOf != null) {
    const target = await c.env.DB.prepare(
      "SELECT id, version_of, parent_id FROM thought WHERE id = ?"
    ).bind(versionOf).first<{ id: number; version_of: number | null; parent_id: number | null }>();
    if (!target) {
      return c.json({ error: "Target thought not found" }, 404);
    }
    if (target.parent_id != null) {
      return c.json({ error: "Cannot version a reply" }, 400);
    }
    // Resolve to root
    resolvedVersionOf = target.version_of ?? target.id;

    // Find current latest in chain
    const latest = await c.env.DB.prepare(
      "SELECT id FROM thought WHERE (id = ? OR version_of = ?) AND superseded_by IS NULL"
    ).bind(resolvedVersionOf, resolvedVersionOf).first<{ id: number }>();
    if (!latest) {
      return c.json({ error: "Version chain is broken" }, 500);
    }
    previousLatestId = latest.id;
  }

  if (parentId != null) {
    const parent = await c.env.DB.prepare(
      "SELECT id FROM thought WHERE id = ?"
    ).bind(parentId).first();
    if (!parent) {
      return c.json({ error: "Parent thought not found" }, 404);
    }
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File "${file.name}" exceeds 5MB limit` }, 400);
    }
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const bodyHash = await hashBody(trimmed);

  const result = await c.env.DB.prepare(
    "INSERT INTO thought (body, body_hash, timestamp, parent_id, private, version_of) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(trimmed, bodyHash, timestamp, parentId, isPrivate ? 1 : 0, resolvedVersionOf).run();

  const thoughtId = result.meta.last_row_id;

  // Update previous latest version to point to this new one
  if (previousLatestId != null) {
    await c.env.DB.prepare(
      "UPDATE thought SET superseded_by = ? WHERE id = ?"
    ).bind(thoughtId, previousLatestId).run();
  }

  const tags = extractTags(trimmed);
  for (const tagName of tags) {
    await c.env.DB.prepare("INSERT OR IGNORE INTO tag (name) VALUES (?)").bind(tagName).run();
    const tagRow = await c.env.DB.prepare("SELECT id FROM tag WHERE name = ?").bind(tagName).first();
    await c.env.DB.prepare("INSERT OR IGNORE INTO thought_tag (thought_id, tag_id) VALUES (?, ?)").bind(thoughtId, tagRow!.id).run();
  }

  const tasks = extractTasks(trimmed);
  for (const task of tasks) {
    await c.env.DB.prepare(
      "INSERT INTO task (thought_id, title, description, created_at) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, task.title, task.description, timestamp).run();
  }

  const events = extractEvents(trimmed, timestamp);
  for (const event of events) {
    await c.env.DB.prepare(
      "INSERT INTO event (thought_id, title, description, date_text, date_epoch, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(thoughtId, event.title, event.description, event.dateText, event.dateEpoch, timestamp).run();
  }

  const locations = extractLocations(trimmed);
  for (const loc of locations) {
    const geo = await geocodeLocation(loc.title, c.env.MAPBOX_TOKEN);
    await c.env.DB.prepare(
      "INSERT INTO location (thought_id, title, description, lat, lng, resolved_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(thoughtId, loc.title, loc.description, geo?.lat ?? null, geo?.lng ?? null, geo?.resolvedName ?? null, timestamp).run();
  }

  const movies = extractMovies(trimmed);
  for (const movie of movies) {
    const normalized = normalizeMovieTitle(movie.title);
    const existing = await c.env.DB.prepare(
      "SELECT id FROM movie WHERE normalized_title = ?"
    ).bind(normalized).first<{ id: number }>();

    let movieId: number;
    if (existing) {
      movieId = existing.id;
    } else {
      const meta = c.env.TMDB_API_KEY ? await lookupMovie(movie.title, c.env.TMDB_API_KEY) : null;
      const result = await c.env.DB.prepare(
        "INSERT INTO movie (title, normalized_title, description, poster_url, year, tmdb_id, vote_average, vote_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(movie.title, normalized, movie.description, meta?.posterUrl ?? null, meta?.year ?? null, meta?.tmdbId ?? null, meta?.voteAverage ?? null, meta?.voteCount ?? null, timestamp).run();
      movieId = result.meta.last_row_id as number;
    }

    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO thought_movie (thought_id, movie_id, description, created_at) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, movieId, movie.description, timestamp).run();
  }

  const books = extractBooks(trimmed);
  for (const book of books) {
    const meta = await lookupBook(book.title);
    await c.env.DB.prepare(
      "INSERT INTO book (thought_id, title, description, cover_url, author, year, ol_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(thoughtId, book.title, book.description, meta?.coverUrl ?? null, meta?.author ?? null, meta?.year ?? null, meta?.olKey ?? null, timestamp).run();
  }

  const albums = extractAlbums(trimmed);
  for (const album of albums) {
    const normalized = normalizeAlbumTitle(album.title);
    const existing = await c.env.DB.prepare(
      "SELECT id FROM album WHERE normalized_title = ?"
    ).bind(normalized).first<{ id: number }>();

    let albumId: number;
    if (existing) {
      albumId = existing.id;
    } else {
      const meta = await lookupAlbum(album.title);
      const result = await c.env.DB.prepare(
        "INSERT INTO album (title, normalized_title, artist, year, cover_url, itunes_id, genre, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(album.title, normalized, meta?.artist ?? null, meta?.year ?? null, meta?.coverUrl ?? null, meta?.itunesId ?? null, meta?.genre ?? null, timestamp).run();
      albumId = result.meta.last_row_id as number;
    }

    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO thought_album (thought_id, album_id, description, created_at) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, albumId, album.description, timestamp).run();
  }

  const questions = extractQuestions(trimmed);
  for (const question of questions) {
    await c.env.DB.prepare(
      "INSERT INTO question (thought_id, title, description, created_at) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, question.title, question.description, timestamp).run();
  }

  const bookmarkDefs = extractBookmarks(trimmed);
  for (const bm of bookmarkDefs) {
    await c.env.DB.prepare(
      "INSERT OR IGNORE INTO bookmark (url, title, created_at) VALUES (?, ?, ?)"
    ).bind(bm.url, bm.title, timestamp).run();
    const row = await c.env.DB.prepare("SELECT id, image_url FROM bookmark WHERE url = ?").bind(bm.url).first<{ id: number; image_url: string | null }>();
    if (row) {
      if (bm.title) {
        await c.env.DB.prepare("UPDATE bookmark SET title = ? WHERE id = ? AND title IS NULL").bind(bm.title, row.id).run();
      }
      if (!row.image_url) {
        const og = await fetchOgMetadata(bm.url);
        if (og) {
          await c.env.DB.prepare(
            "UPDATE bookmark SET image_url = ?, description = ?, site_name = ?, title = COALESCE(title, ?) WHERE id = ?"
          ).bind(og.imageUrl, og.description, og.siteName, og.title, row.id).run();
        }
      }
      await c.env.DB.prepare(
        "INSERT OR IGNORE INTO thought_bookmark (thought_id, bookmark_id) VALUES (?, ?)"
      ).bind(thoughtId, row.id).run();
    }
  }

  const linkedIds = extractThoughtLinks(trimmed);
  for (const targetId of linkedIds) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO thought_edge (source_id, target_id)
       SELECT ?, ? WHERE EXISTS (SELECT 1 FROM thought WHERE id = ?)`
    ).bind(thoughtId, targetId, targetId).run();
  }

  const attachments: { key: string; type: string; name: string }[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `thoughts/${thoughtId}/${safeName}`;
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    await c.env.DB.prepare(
      "INSERT INTO thought_attachment (thought_id, attachment_key, attachment_type, attachment_name) VALUES (?, ?, ?, ?)"
    ).bind(thoughtId, key, file.type, file.name).run();
    attachments.push({ key, type: file.type, name: file.name });
  }

  const { color, vec } = await upsertThoughtEmbedding(c.env, thoughtId, trimmed, timestamp, parentId);

  if (vec) {
    const title = trimmed.split("\n")[0]?.slice(0, 80) ?? null;
    const preview = trimmed.slice(0, 200);
    scheduleBackground(c, assignClusters(c.env, "thought", thoughtId, title, preview, vec));
  }

  const thought: Record<string, unknown> = {
    id: thoughtId,
    body: trimmed,
    body_hash: bodyHash,
    timestamp,
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    parent_id: parentId,
    version_of: resolvedVersionOf,
    superseded_by: null,
    private: isPrivate ? 1 : 0,
    attachments,
    color,
  };
  await attachDuplicateIds(c.env.DB, [thought], true);

  return c.json(thought, 201);
});

api.delete("/thoughts/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"), 10);

  // Resolve version chain root
  const target = await c.env.DB.prepare(
    "SELECT id, version_of FROM thought WHERE id = ?"
  ).bind(id).first<{ id: number; version_of: number | null }>();

  if (!target) {
    return c.json({ error: "Not found" }, 404);
  }

  const root = target.version_of ?? target.id;

  // Collect all version chain IDs (root + all versions)
  const versionChain = await c.env.DB.prepare(
    "SELECT id FROM thought WHERE id = ? OR version_of = ?"
  ).bind(root, root).all();
  const chainIds = versionChain.results.map((r) => r.id as number);

  // Collect all descendants and their attachment keys in one query
  const chainPlaceholders = chainIds.map(() => "?").join(",");
  const descendants = await c.env.DB.prepare(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM thought WHERE id IN (${chainPlaceholders})
       UNION ALL
       SELECT t.id FROM thought t JOIN descendants d ON t.parent_id = d.id
     )
     SELECT d.id, ta.attachment_key
     FROM descendants d
     LEFT JOIN thought_attachment ta ON ta.thought_id = d.id`
  ).bind(...chainIds).all();

  const descendantIds: number[] = [];
  const keys: string[] = [];
  const seen = new Set<number>();
  for (const row of descendants.results) {
    const id = row.id as number;
    if (!seen.has(id)) {
      seen.add(id);
      descendantIds.push(id);
    }
    if (row.attachment_key) {
      keys.push(row.attachment_key as string);
    }
  }

  if (keys.length > 0) {
    await c.env.BUCKET.delete(keys);
  }

  // Delete chain roots — ON DELETE CASCADE handles descendants and related rows
  await c.env.DB.prepare(
    `DELETE FROM thought WHERE id IN (${chainPlaceholders})`
  ).bind(...chainIds).run();

  await c.env.DB.prepare(
    "DELETE FROM tag WHERE id NOT IN (SELECT DISTINCT tag_id FROM thought_tag)"
  ).run();

  await deleteThoughtEmbeddings(c.env, descendantIds);
  for (const tid of descendantIds) {
    scheduleBackground(c, removeClusterMembership(c.env, "thought", tid));
  }

  return c.body(null, 204);
});

api.get("/tasks", async (c) => {
  const status = c.req.query("status") || "incomplete";
  const tags = c.req.query("tags")?.split(",").filter(Boolean) ?? [];

  let baseWhere = "";
  if (status === "incomplete") {
    baseWhere = "WHERE tk.completed_at IS NULL AND tk.deprioritized_at IS NULL";
  } else if (status === "deprioritized") {
    baseWhere = "WHERE tk.deprioritized_at IS NOT NULL AND tk.completed_at IS NULL";
  }
  // status === "all" → no filter

  let tagFilter = "";
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    tagFilter = `${baseWhere ? " AND" : " WHERE"} tk.thought_id IN (
      SELECT tt.thought_id FROM thought_tag tt
      JOIN tag tg ON tg.id = tt.tag_id
      WHERE tg.name IN (${placeholders})
      GROUP BY tt.thought_id
      HAVING COUNT(DISTINCT tg.name) = ?
    )`;
  }

  const query = `SELECT tk.id, tk.thought_id, tk.title, tk.description, tk.created_at, tk.completed_at, tk.deprioritized_at FROM task tk ${baseWhere}${tagFilter} ORDER BY tk.created_at DESC`;
  const bindings = tags.length > 0 ? [...tags, tags.length] : [];

  const results = await c.env.DB.prepare(query).bind(...bindings).all();

  return c.json({ tasks: results.results });
});

api.patch("/tasks/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const { completed, deprioritized } = UpdateTaskBody.parse(await c.req.json());

  if (completed !== undefined) {
    if (completed) {
      const now = Math.floor(Date.now() / 1000);
      await c.env.DB.prepare(
        "UPDATE task SET completed_at = ? WHERE id = ?"
      ).bind(now, id).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE task SET completed_at = NULL WHERE id = ?"
      ).bind(id).run();
    }
  }

  if (deprioritized !== undefined) {
    if (deprioritized) {
      const now = Math.floor(Date.now() / 1000);
      await c.env.DB.prepare(
        "UPDATE task SET deprioritized_at = ? WHERE id = ?"
      ).bind(now, id).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE task SET deprioritized_at = NULL WHERE id = ?"
      ).bind(id).run();
    }
  }

  const task = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, created_at, completed_at, deprioritized_at FROM task WHERE id = ?"
  ).bind(id).first();

  if (!task) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(task);
});

api.get("/questions", async (c) => {
  const status = c.req.query("status") || "open";
  const tagsParam = c.req.query("tags");
  const tags = tagsParam ? tagsParam.split(",").map((t) => decodeURIComponent(t.trim())).filter(Boolean) : [];

  let baseWhere = "";
  if (status === "open") {
    baseWhere = "WHERE q.answered_at IS NULL";
  } else if (status === "answered") {
    baseWhere = "WHERE q.answered_at IS NOT NULL";
  }

  let tagFilter = "";
  if (tags.length > 0) {
    const placeholders = tags.map(() => "?").join(",");
    tagFilter = `${baseWhere ? " AND" : " WHERE"} q.thought_id IN (
      SELECT tt.thought_id FROM thought_tag tt
      JOIN tag tg ON tg.id = tt.tag_id
      WHERE tg.name IN (${placeholders})
      GROUP BY tt.thought_id
      HAVING COUNT(DISTINCT tg.name) = ?
    )`;
  }

  const query = `SELECT q.id, q.thought_id, q.title, q.description, q.created_at, q.answered_at FROM question q ${baseWhere}${tagFilter} ORDER BY q.created_at DESC`;
  const bindings = tags.length > 0 ? [...tags, tags.length] : [];

  const results = await c.env.DB.prepare(query).bind(...bindings).all();

  return c.json({ questions: results.results });
});

api.patch("/questions/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const { answered } = UpdateQuestionBody.parse(await c.req.json());

  if (answered !== undefined) {
    if (answered) {
      const now = Math.floor(Date.now() / 1000);
      await c.env.DB.prepare(
        "UPDATE question SET answered_at = ? WHERE id = ?"
      ).bind(now, id).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE question SET answered_at = NULL WHERE id = ?"
      ).bind(id).run();
    }
  }

  const question = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, created_at, answered_at FROM question WHERE id = ?"
  ).bind(id).first();

  if (!question) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json(question);
});

api.get("/events", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  let query = "SELECT id, thought_id, title, description, date_text, date_epoch, created_at FROM event";
  const bindings: (string | number)[] = [];

  if (from && to) {
    query += " WHERE date_epoch >= ? AND date_epoch < ?";
    bindings.push(parseInt(from, 10), parseInt(to, 10));
  } else if (from) {
    query += " WHERE date_epoch >= ?";
    bindings.push(parseInt(from, 10));
  } else if (to) {
    query += " WHERE date_epoch < ?";
    bindings.push(parseInt(to, 10));
  }

  query += " ORDER BY date_epoch ASC";

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ events: results.results });
});

api.get("/events.ics", async (c) => {
  const token = c.req.query("token");
  if (!token || token !== c.env.ICAL_TOKEN) {
    return c.text("Unauthorized", 401);
  }

  const results = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, date_text, date_epoch, created_at FROM event ORDER BY date_epoch ASC"
  ).all();

  const ics = generateICS(results.results as any);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
});

// --- Locations ---

api.get("/locations", async (c) => {
  const thoughtId = c.req.query("thought_id");

  let query = "SELECT id, thought_id, title, description, lat, lng, resolved_name, created_at FROM location";
  const bindings: (string | number)[] = [];

  if (thoughtId) {
    query += " WHERE thought_id = ?";
    bindings.push(parseInt(thoughtId, 10));
  }

  query += " ORDER BY created_at DESC";

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ locations: results.results });
});

api.post("/locations/:id/geocode", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const loc = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, lat, lng, resolved_name, created_at FROM location WHERE id = ?"
  ).bind(id).first();

  if (!loc) {
    return c.json({ error: "Not found" }, 404);
  }

  const geo = await geocodeLocation(loc.title as string, c.env.MAPBOX_TOKEN);

  await c.env.DB.prepare(
    "UPDATE location SET lat = ?, lng = ?, resolved_name = ? WHERE id = ?"
  ).bind(geo?.lat ?? null, geo?.lng ?? null, geo?.resolvedName ?? null, id).run();

  return c.json({
    ...loc,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    resolved_name: geo?.resolvedName ?? null,
  });
});

api.patch("/locations/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json() as { title?: string };
  const newTitle = (body.title ?? "").trim();
  if (!newTitle) return c.json({ error: "title required" }, 400);

  const geo = await geocodeLocation(newTitle, c.env.MAPBOX_TOKEN);

  await c.env.DB.prepare(
    "UPDATE location SET title = ?, lat = ?, lng = ?, resolved_name = ? WHERE id = ?"
  ).bind(newTitle, geo?.lat ?? null, geo?.lng ?? null, geo?.resolvedName ?? null, id).run();

  const row = await c.env.DB.prepare(
    "SELECT id, thought_id, title, description, lat, lng, resolved_name, created_at FROM location WHERE id = ?"
  ).bind(id).first();

  return c.json(row);
});

api.post("/locations/regeocode", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = await c.env.DB.prepare(
    "SELECT id, title FROM location WHERE lat IS NULL"
  ).all<{ id: number; title: string }>();

  const results: Array<{ id: number; title: string; resolved: boolean }> = [];
  for (const row of rows.results) {
    const geo = await geocodeLocation(row.title, c.env.MAPBOX_TOKEN);
    if (geo) {
      await c.env.DB.prepare(
        "UPDATE location SET lat = ?, lng = ?, resolved_name = ? WHERE id = ?"
      ).bind(geo.lat, geo.lng, geo.resolvedName, row.id).run();
    }
    results.push({ id: row.id, title: row.title, resolved: !!geo });
  }

  return c.json({
    total: rows.results.length,
    resolved: results.filter((r) => r.resolved).length,
    results,
  });
});

// --- Movies ---

const MOVIE_SELECT = `
  SELECT m.id, m.title, m.description, m.poster_url, m.year, m.tmdb_id, m.vote_average, m.vote_count, m.created_at,
    agg.mention_count, agg.thought_id,
    (SELECT COUNT(*) FROM thought r WHERE r.parent_id = agg.thought_id AND r.private = 0) AS reply_count
  FROM movie m
  JOIN (
    SELECT tm.movie_id,
      COUNT(DISTINCT tm.thought_id) AS mention_count,
      MIN(tm.thought_id) AS thought_id
    FROM thought_movie tm
    GROUP BY tm.movie_id
  ) agg ON agg.movie_id = m.id
`;

api.get("/movies", async (c) => {
  const thoughtId = c.req.query("thought_id");

  let query = MOVIE_SELECT;
  const bindings: (string | number)[] = [];

  if (thoughtId) {
    query += " WHERE m.id IN (SELECT movie_id FROM thought_movie WHERE thought_id = ?)";
    bindings.push(parseInt(thoughtId, 10));
  }

  query += " ORDER BY m.created_at DESC";

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ movies: results.results });
});

// One-off: rebuild thought_movie links by re-parsing thought bodies.
// Needed because the 0038 migration's seed INSERT apparently executed against remote D1
// without populating the join table, leaving every movie orphaned from its source thought.
api.post("/movies/rebuild-links", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const thoughts = await c.env.DB.prepare(
    "SELECT id, body, created_at FROM thought WHERE body LIKE '%#m %'"
  ).all<{ id: number; body: string; created_at: number }>();

  const movieRows = await c.env.DB.prepare(
    "SELECT id, normalized_title FROM movie"
  ).all<{ id: number; normalized_title: string }>();

  const movieIdByNormTitle = new Map(
    movieRows.results.map((r) => [r.normalized_title, r.id]),
  );

  let linksCreated = 0;
  let missingMovies = 0;

  for (const t of thoughts.results) {
    const movies = extractMovies(t.body);
    for (const m of movies) {
      const norm = normalizeMovieTitle(m.title);
      const movieId = movieIdByNormTitle.get(norm);
      if (!movieId) {
        missingMovies++;
        continue;
      }
      const res = await c.env.DB.prepare(
        "INSERT OR IGNORE INTO thought_movie (thought_id, movie_id, description, created_at) VALUES (?, ?, ?, ?)"
      ).bind(t.id, movieId, m.description, t.created_at).run();
      if (res.meta.changes > 0) linksCreated++;
    }
  }

  return c.json({ links_created: linksCreated, thoughts_scanned: thoughts.results.length, missing_movies: missingMovies });
});

api.post("/movies/backfill", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!c.env.TMDB_API_KEY) {
    return c.json({ error: "TMDB_API_KEY not configured" }, 500);
  }

  const rows = await c.env.DB.prepare(
    "SELECT id, title FROM movie WHERE poster_url IS NULL"
  ).all();

  let updated = 0;
  for (const row of rows.results) {
    const meta = await lookupMovie(row.title as string, c.env.TMDB_API_KEY);
    if (meta) {
      await c.env.DB.prepare(
        "UPDATE movie SET poster_url = ?, year = ?, tmdb_id = ?, vote_average = ?, vote_count = ? WHERE id = ?"
      ).bind(meta.posterUrl, meta.year, meta.tmdbId, meta.voteAverage, meta.voteCount, row.id).run();
      updated++;
    }
  }

  return c.json({ backfilled: updated, total: rows.results.length });
});

api.patch("/movies/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  if (!c.env.TMDB_API_KEY) return c.json({ error: "TMDB_API_KEY not configured" }, 500);

  const id = parseInt(c.req.param("id"), 10);
  const body = UpdateMovieBody.parse(await c.req.json());

  const meta = body.tmdb_id
    ? await fetchMovieById(body.tmdb_id, c.env.TMDB_API_KEY)
    : await lookupMovie(body.title!, c.env.TMDB_API_KEY);

  if (!meta) return c.json({ error: "Movie not found on TMDB" }, 404);

  await c.env.DB.prepare(
    "UPDATE movie SET title = ?, normalized_title = ?, poster_url = ?, year = ?, tmdb_id = ?, vote_average = ?, vote_count = ? WHERE id = ?"
  ).bind(meta.title, normalizeMovieTitle(meta.title), meta.posterUrl, meta.year, meta.tmdbId, meta.voteAverage, meta.voteCount, id).run();

  const row = await c.env.DB.prepare(
    `${MOVIE_SELECT} WHERE m.id = ?`
  ).bind(id).first();

  return c.json(row);
});

// --- Books ---

api.get("/books", async (c) => {
  const thoughtId = c.req.query("thought_id");

  let query = `SELECT b.id, b.thought_id, b.title, b.description, b.cover_url, b.author, b.year, b.ol_key, b.created_at,
    (SELECT COUNT(*) FROM thought r WHERE r.parent_id = b.thought_id AND r.private = 0) AS reply_count
  FROM book b`;
  const bindings: (string | number)[] = [];

  if (thoughtId) {
    query += " WHERE b.thought_id = ?";
    bindings.push(parseInt(thoughtId, 10));
  }

  query += " ORDER BY b.created_at DESC";

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ books: results.results });
});

api.post("/books/backfill", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = await c.env.DB.prepare(
    "SELECT id, title FROM book WHERE cover_url IS NULL"
  ).all();

  let updated = 0;
  for (const row of rows.results) {
    const meta = await lookupBook(row.title as string);
    if (meta) {
      await c.env.DB.prepare(
        "UPDATE book SET cover_url = ?, author = ?, year = ?, ol_key = ? WHERE id = ?"
      ).bind(meta.coverUrl, meta.author, meta.year, meta.olKey, row.id).run();
      updated++;
    }
  }

  return c.json({ backfilled: updated, total: rows.results.length });
});

api.patch("/books/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const id = parseInt(c.req.param("id"), 10);
  const body = UpdateBookBody.parse(await c.req.json());

  const meta = body.ol_key
    ? await fetchBookByKey(body.ol_key)
    : await lookupBook(body.title!);
  if (!meta) return c.json({ error: "Book not found on Open Library" }, 404);

  await c.env.DB.prepare(
    "UPDATE book SET title = ?, cover_url = ?, author = ?, year = ?, ol_key = ? WHERE id = ?"
  ).bind(meta.title, meta.coverUrl, meta.author, meta.year, meta.olKey, id).run();

  const row = await c.env.DB.prepare(
    `SELECT b.id, b.thought_id, b.title, b.description, b.cover_url, b.author, b.year, b.ol_key, b.created_at,
      (SELECT COUNT(*) FROM thought r WHERE r.parent_id = b.thought_id AND r.private = 0) AS reply_count
    FROM book b WHERE b.id = ?`
  ).bind(id).first();

  return c.json(row);
});

// --- Albums ---

const ALBUM_SELECT = `
  SELECT a.id, a.title, a.artist, a.year, a.cover_url, a.itunes_id, a.genre, a.created_at,
    agg.mention_count, agg.thought_id,
    (SELECT COUNT(*) FROM thought r WHERE r.parent_id = agg.thought_id AND r.private = 0) AS reply_count
  FROM album a
  JOIN (
    SELECT ta.album_id,
      COUNT(DISTINCT ta.thought_id) AS mention_count,
      MIN(ta.thought_id) AS thought_id
    FROM thought_album ta
    GROUP BY ta.album_id
  ) agg ON agg.album_id = a.id
`;

api.get("/albums", async (c) => {
  const thoughtId = c.req.query("thought_id");

  let query = ALBUM_SELECT;
  const bindings: (string | number)[] = [];

  if (thoughtId) {
    query += " WHERE a.id IN (SELECT album_id FROM thought_album WHERE thought_id = ?)";
    bindings.push(parseInt(thoughtId, 10));
  }

  query += " ORDER BY a.created_at DESC";

  const results = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ albums: results.results });
});

api.post("/albums/backfill", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const rows = await c.env.DB.prepare(
    "SELECT id, title FROM album WHERE cover_url IS NULL"
  ).all();

  let updated = 0;
  for (const row of rows.results) {
    const meta = await lookupAlbum(row.title as string);
    if (meta) {
      await c.env.DB.prepare(
        "UPDATE album SET artist = ?, year = ?, cover_url = ?, itunes_id = ?, genre = ? WHERE id = ?"
      ).bind(meta.artist, meta.year, meta.coverUrl, meta.itunesId, meta.genre, row.id).run();
      updated++;
    }
  }

  return c.json({ backfilled: updated, total: rows.results.length });
});

api.patch("/albums/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const id = parseInt(c.req.param("id"), 10);
  const body = UpdateAlbumBody.parse(await c.req.json());

  const meta = body.itunes_id
    ? await fetchAlbumById(body.itunes_id)
    : await lookupAlbum(body.title!);
  if (!meta) return c.json({ error: "Album not found on iTunes" }, 404);

  await c.env.DB.prepare(
    "UPDATE album SET title = ?, normalized_title = ?, artist = ?, year = ?, cover_url = ?, itunes_id = ?, genre = ? WHERE id = ?"
  ).bind(meta.title, normalizeAlbumTitle(meta.title), meta.artist, meta.year, meta.coverUrl, meta.itunesId, meta.genre, id).run();

  const row = await c.env.DB.prepare(
    `${ALBUM_SELECT} WHERE a.id = ?`
  ).bind(id).first();

  return c.json(row);
});

// --- Bookmarks ---

api.get("/bookmarks", async (c) => {
  const results = await c.env.DB.prepare(
    `SELECT b.id, b.url, b.title, b.image_url, b.description, b.site_name, b.created_at,
       COUNT(tb.thought_id) AS thought_count
     FROM bookmark b
     LEFT JOIN thought_bookmark tb ON tb.bookmark_id = b.id
     GROUP BY b.id
     ORDER BY b.created_at DESC`
  ).all();
  return c.json({ bookmarks: results.results });
});

api.post("/bookmarks/backfill", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const rows = await c.env.DB.prepare(
    "SELECT id, url FROM bookmark WHERE image_url IS NULL"
  ).all();

  let updated = 0;
  for (const row of rows.results) {
    const og = await fetchOgMetadata(row.url as string);
    if (og) {
      await c.env.DB.prepare(
        "UPDATE bookmark SET image_url = ?, description = ?, site_name = ?, title = COALESCE(title, ?) WHERE id = ?"
      ).bind(og.imageUrl, og.description, og.siteName, og.title, row.id).run();
      updated++;
    }
  }

  return c.json({ backfilled: updated, total: rows.results.length });
});

api.patch("/bookmarks/:id", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);

  const id = parseInt(c.req.param("id"), 10);
  const row = await c.env.DB.prepare("SELECT url FROM bookmark WHERE id = ?").bind(id).first<{ url: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);

  const og = await fetchOgMetadata(row.url);
  if (!og) return c.json({ error: "Could not fetch OG metadata" }, 422);

  await c.env.DB.prepare(
    "UPDATE bookmark SET image_url = ?, description = ?, site_name = ?, title = COALESCE(title, ?) WHERE id = ?"
  ).bind(og.imageUrl, og.description, og.siteName, og.title, id).run();

  const updated = await c.env.DB.prepare(
    `SELECT b.id, b.url, b.title, b.image_url, b.description, b.site_name, b.created_at,
       COUNT(tb.thought_id) AS thought_count
     FROM bookmark b
     LEFT JOIN thought_bookmark tb ON tb.bookmark_id = b.id
     WHERE b.id = ?
     GROUP BY b.id`
  ).bind(id).first();

  return c.json(updated);
});

// --- Media ---

api.get("/media", async (c) => {
  const limitParam = Math.min(parseInt(c.req.query("limit") || "50", 10) || 50, 200);
  const offsetParam = parseInt(c.req.query("offset") || "0", 10) || 0;
  const authed = isAuthed(c);
  const privateFilter = authed ? "" : " AND t.private = 0";

  const results = await c.env.DB.prepare(
    `SELECT a.attachment_key, a.attachment_type, a.attachment_name, a.thought_id,
       t.body, t.timestamp, t.color
     FROM thought_attachment a
     JOIN thought t ON t.id = a.thought_id
     WHERE a.attachment_type LIKE 'image/%'${privateFilter}
     ORDER BY t.timestamp DESC
     LIMIT ? OFFSET ?`
  ).bind(limitParam, offsetParam).all();

  const hasMore = results.results.length === limitParam;

  return c.json({
    media: results.results.map((r) => ({
      key: r.attachment_key as string,
      type: r.attachment_type as string,
      name: r.attachment_name as string,
      thought_id: r.thought_id as number,
      body: r.body as string,
      timestamp: r.timestamp as number,
      color: r.color as string | null,
    })),
    meta: { hasMore },
  });
});

// --- Framings ---

api.get("/framings", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT id, name, description, created_at, updated_at FROM framing ORDER BY updated_at DESC"
  ).all();
  return c.json({ framings: results.results });
});

api.post("/framings", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { name, description } = CreateFramingBody.parse(await c.req.json());

  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB.prepare(
    "INSERT INTO framing (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).bind(name.trim(), description?.trim() || null, now, now).run();

  return c.json({
    id: result.meta.last_row_id,
    name: name.trim(),
    description: description?.trim() || null,
    created_at: now,
    updated_at: now,
  }, 201);
});

api.post("/framings/import", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { name, nodes, edges } = ImportFramingBody.parse(await c.req.json());

  const now = Math.floor(Date.now() / 1000);
  const framingResult = await c.env.DB.prepare(
    "INSERT INTO framing (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).bind(name.trim(), null, now, now).run();
  const framingId = framingResult.meta.last_row_id;

  // Map exported node ID → new framing_node ID
  const nodeIdMap = new Map<string, number>();

  for (const node of nodes) {
    if (node.type === "thought") {
      const thoughtId = typeof node.id === "string" ? parseInt(node.id, 10) : node.id;
      // Ensure thought exists
      const existing = await c.env.DB.prepare("SELECT id FROM thought WHERE id = ?").bind(thoughtId).first();
      if (!existing) {
        const ts = node.timestamp ?? now;
        const body = node.body ?? "";
        await c.env.DB.prepare(
          "INSERT INTO thought (id, body, timestamp, private) VALUES (?, ?, ?, 0)"
        ).bind(thoughtId, body, ts).run();
      }
      const fnResult = await c.env.DB.prepare(
        "INSERT INTO framing_node (framing_id, node_type, item_id, x, y) VALUES (?, 'thought', ?, ?, ?)"
      ).bind(framingId, String(thoughtId), node.x, node.y).run();
      nodeIdMap.set(String(node.id), fnResult.meta.last_row_id as number);
    } else {
      const slug = node.slug ?? String(node.id);
      const fnResult = await c.env.DB.prepare(
        "INSERT INTO framing_node (framing_id, node_type, item_id, x, y) VALUES (?, 'post', ?, ?, ?)"
      ).bind(framingId, slug, node.x, node.y).run();
      nodeIdMap.set(String(node.id), fnResult.meta.last_row_id as number);
    }
  }

  let edgesCreated = 0;
  for (const edge of edges) {
    const sourceNodeId = nodeIdMap.get(String(edge.source));
    const targetNodeId = nodeIdMap.get(String(edge.target));
    if (sourceNodeId == null || targetNodeId == null) continue;
    await c.env.DB.prepare(
      "INSERT INTO framing_edge (framing_id, source_node_id, target_node_id, label) VALUES (?, ?, ?, ?)"
    ).bind(framingId, sourceNodeId, targetNodeId, edge.label?.trim() || null).run();
    edgesCreated++;
  }

  return c.json({ id: framingId }, 201);
});

api.get("/framings/:id", async (c) => {
  const id = c.req.param("id");

  const framing = await c.env.DB.prepare(
    "SELECT id, name, description, created_at, updated_at FROM framing WHERE id = ?"
  ).bind(id).first();

  if (!framing) {
    return c.json({ error: "Not found" }, 404);
  }

  const nodes = await c.env.DB.prepare(
    `SELECT fn.id, fn.node_type, fn.item_id, fn.x, fn.y, fn.w, fn.h,
            t.body, t.timestamp, t.color,
            CASE WHEN fn.node_type = 'thought'
              THEN (SELECT COUNT(*) FROM thought r WHERE r.parent_id = t.id AND r.private = 0)
              ELSE NULL
            END AS reply_count
     FROM framing_node fn
     LEFT JOIN thought t ON fn.node_type = 'thought' AND t.id = CAST(fn.item_id AS INTEGER)
     WHERE fn.framing_id = ?`
  ).bind(id).all();

  const edges = await c.env.DB.prepare(
    "SELECT id, source_node_id, target_node_id, label, source_handle, target_handle, kind FROM framing_edge WHERE framing_id = ?"
  ).bind(id).all();

  return c.json({
    framing,
    nodes: nodes.results,
    edges: edges.results,
  });
});

api.patch("/framings/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const { name, description } = UpdateFramingBody.parse(await c.req.json());

  const existing = await c.env.DB.prepare(
    "SELECT id FROM framing WHERE id = ?"
  ).bind(id).first();
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = ["updated_at = ?"];
  const bindings: (string | number | null)[] = [now];

  if (name !== undefined) {
    sets.push("name = ?");
    bindings.push(name.trim());
  }
  if (description !== undefined) {
    sets.push("description = ?");
    bindings.push(description?.trim() || null);
  }

  bindings.push(parseInt(id));
  await c.env.DB.prepare(
    `UPDATE framing SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...bindings).run();

  const updated = await c.env.DB.prepare(
    "SELECT id, name, description, created_at, updated_at FROM framing WHERE id = ?"
  ).bind(id).first();

  return c.json(updated);
});

api.delete("/framings/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  const result = await c.env.DB.prepare(
    "DELETE FROM framing WHERE id = ?"
  ).bind(id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// --- Framing Nodes ---

api.post("/framings/:id/nodes", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const { node_type, item_id, x, y, w, h } = PlaceNodeBody.parse(await c.req.json());

  const framing = await c.env.DB.prepare("SELECT id FROM framing WHERE id = ?").bind(framingId).first();
  if (!framing) {
    return c.json({ error: "Framing not found" }, 404);
  }

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO framing_node (framing_id, node_type, item_id, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(parseInt(framingId), node_type, item_id, x, y, w ?? null, h ?? null).run();

    return c.json({
      id: result.meta.last_row_id,
      framing_id: parseInt(framingId),
      node_type,
      item_id,
      x,
      y,
      w: w ?? null,
      h: h ?? null,
    }, 201);
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "Item already placed in this framing" }, 409);
    }
    throw e;
  }
});

api.patch("/framings/:id/nodes/:nodeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const nodeId = c.req.param("nodeId");
  const updates = UpdateNodeBody.parse(await c.req.json());

  const sets: string[] = [];
  const bindings: (number | null)[] = [];

  if (updates.x !== undefined) { sets.push("x = ?"); bindings.push(updates.x); }
  if (updates.y !== undefined) { sets.push("y = ?"); bindings.push(updates.y); }
  if (updates.w !== undefined) { sets.push("w = ?"); bindings.push(updates.w); }
  if (updates.h !== undefined) { sets.push("h = ?"); bindings.push(updates.h); }

  if (sets.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  bindings.push(parseInt(nodeId), parseInt(framingId));
  const result = await c.env.DB.prepare(
    `UPDATE framing_node SET ${sets.join(", ")} WHERE id = ? AND framing_id = ?`
  ).bind(...bindings).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  const node = await c.env.DB.prepare(
    "SELECT id, framing_id, node_type, item_id, x, y, w, h FROM framing_node WHERE id = ?"
  ).bind(nodeId).first();

  return c.json(node);
});

api.delete("/framings/:id/nodes/:nodeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const nodeId = c.req.param("nodeId");

  const result = await c.env.DB.prepare(
    "DELETE FROM framing_node WHERE id = ? AND framing_id = ?"
  ).bind(nodeId, framingId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// --- Framing Edges ---

api.post("/framings/:id/edges", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const { source_node_id, target_node_id, label, source_handle, target_handle, kind } = CreateEdgeBody.parse(await c.req.json());

  const result = await c.env.DB.prepare(
    "INSERT INTO framing_edge (framing_id, source_node_id, target_node_id, label, source_handle, target_handle, kind) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(parseInt(framingId), source_node_id, target_node_id, label?.trim() || null, source_handle || null, target_handle || null, kind || null).run();

  return c.json({
    id: result.meta.last_row_id,
    framing_id: parseInt(framingId),
    source_node_id,
    target_node_id,
    label: label?.trim() || null,
    source_handle: source_handle || null,
    target_handle: target_handle || null,
    kind: kind || null,
  }, 201);
});

api.patch("/framings/:id/edges/:edgeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const edgeId = c.req.param("edgeId");
  const { label } = UpdateEdgeBody.parse(await c.req.json());

  const result = await c.env.DB.prepare(
    "UPDATE framing_edge SET label = ? WHERE id = ? AND framing_id = ?"
  ).bind(label?.trim() || null, edgeId, framingId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  const edge = await c.env.DB.prepare(
    "SELECT id, framing_id, source_node_id, target_node_id, label, source_handle, target_handle, kind FROM framing_edge WHERE id = ?"
  ).bind(edgeId).first();

  return c.json(edge);
});

api.delete("/framings/:id/edges/:edgeId", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = c.req.param("id");
  const edgeId = c.req.param("edgeId");

  const result = await c.env.DB.prepare(
    "DELETE FROM framing_edge WHERE id = ? AND framing_id = ?"
  ).bind(edgeId, framingId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// --- Framing Batch ---

api.patch("/framings/:id/batch", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const framingId = parseInt(c.req.param("id"));
  const { nodes } = BatchUpdateBody.parse(await c.req.json());

  const stmts = nodes.map((n) =>
    c.env.DB.prepare(
      "UPDATE framing_node SET x = ?, y = ?, w = ?, h = ? WHERE id = ? AND framing_id = ?"
    ).bind(n.x, n.y, n.w ?? null, n.h ?? null, n.node_id, framingId)
  );

  await c.env.DB.batch(stmts);

  return c.json({ updated: nodes.length });
});

// --- Canvases ---

api.get("/canvases", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT id, name, created_at, updated_at FROM canvas ORDER BY updated_at DESC"
  ).all();
  return c.json({ canvases: results.results });
});

api.post("/canvases", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { name } = CreateCanvasBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB.prepare(
    "INSERT INTO canvas (name, snapshot, created_at, updated_at) VALUES (?, '{}', ?, ?)"
  ).bind(name, now, now).run();

  return c.json({
    id: result.meta.last_row_id,
    name,
    created_at: now,
    updated_at: now,
  }, 201);
});

api.get("/canvases/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const row = await c.env.DB.prepare(
    "SELECT id, name, snapshot, created_at, updated_at FROM canvas WHERE id = ?"
  ).bind(id).first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

api.patch("/canvases/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"), 10);
  const updates = UpdateCanvasBody.parse(await c.req.json());

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (updates.name !== undefined) { sets.push("name = ?"); binds.push(updates.name); }
  if (updates.snapshot !== undefined) { sets.push("snapshot = ?"); binds.push(updates.snapshot); }
  if (sets.length === 0) return c.json({ error: "No fields to update" }, 400);

  sets.push("updated_at = ?");
  binds.push(Math.floor(Date.now() / 1000));
  binds.push(id);

  await c.env.DB.prepare(
    `UPDATE canvas SET ${sets.join(", ")} WHERE id = ?`
  ).bind(...binds).run();

  const row = await c.env.DB.prepare(
    "SELECT id, name, snapshot, created_at, updated_at FROM canvas WHERE id = ?"
  ).bind(id).first();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

api.delete("/canvases/:id", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.THOUGHT_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(c.req.param("id"), 10);
  await c.env.DB.prepare("DELETE FROM canvas WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

api.get("/attachments/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/attachments\//, "");
  if (!key) return c.json({ error: "Not found" }, 404);

  const object = await c.env.BUCKET.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

api.route("/dha", dha);
api.route("/posts", posts);
api.route("/comments", comments);
api.route("/ig-card", igCard);
api.route("/lists", lists);
api.route("/amplifications", amplifications);
api.route("/clusters", clusters);

// Serve audio files from R2
app.get("/audio/*", async (c) => {
  const key = c.req.path.replace(/^\/audio\//, "");
  if (!key) return c.notFound();
  const object = await c.env.AUDIO_BUCKET.get(key);
  if (!object) return c.notFound();
  const contentType = key.endsWith(".mp3") ? "audio/mpeg" : key.endsWith(".mid") ? "audio/midi" : "application/octet-stream";
  c.header("Content-Type", contentType);
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(object.body);
});

// Mount paste routes (top-level, not under /api)
app.route("/paste", paste);
app.route("/now", now);
app.route("/thoughts/t", thoughtOg);

// Manual digest trigger (auth-gated) — useful for testing the cron job
api.post("/digest/run", async (c) => {
  if (!isAuthed(c)) return c.json({ error: "Unauthorized" }, 401);
  const result = await sendDigest(c.env);
  return c.json(result, result.ok ? 200 : 500);
});

// Mount API routes
app.route("/api", api);

export { TtsWorkflow } from "./tts-workflow.js";

const handler = app as typeof app & {
  scheduled: (event: ScheduledController, env: Env, ctx: ExecutionContext) => void;
};
handler.scheduled = (_event, env, ctx) => {
  ctx.waitUntil(
    sendDigest(env).then((r) => {
      if (!r.ok) console.error("digest failed:", r.reason);
    })
  );
};
export default handler;
