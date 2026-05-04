import type { Env } from "./index";
import { projectToColor } from "./color-projection";

export async function embedText(ai: Ai, text: string): Promise<number[]> {
  const result = (await ai.run("@cf/baai/bge-base-en-v1.5", {
    text: [text],
  })) as { data: number[][] };
  return result.data[0];
}

export async function upsertThoughtEmbedding(
  env: Env,
  thoughtId: number,
  body: string,
  timestamp: number,
  parentId: number | null
): Promise<{ color: string | null; vec: number[] | null }> {
  try {
    const vec = await embedText(env.AI, body);
    await env.VECTORIZE.upsert([
      {
        id: String(thoughtId),
        values: vec,
        metadata: {
          body: body.slice(0, 100),
          timestamp,
          ...(parentId != null ? { parent_id: parentId } : {}),
        },
      },
    ]);
    const color = projectToColor(vec);
    if (color) {
      await env.DB.prepare("UPDATE thought SET color = ? WHERE id = ?")
        .bind(color, thoughtId)
        .run();
    }
    return { color, vec };
  } catch (e) {
    console.error("Failed to upsert thought embedding:", e);
    return { color: null, vec: null };
  }
}

export async function deleteThoughtEmbeddings(
  env: Env,
  ids: (string | number)[]
): Promise<void> {
  try {
    if (ids.length === 0) return;
    const strIds = ids.map(String);
    for (let i = 0; i < strIds.length; i += 20) {
      await env.VECTORIZE.deleteByIds(strIds.slice(i, i + 20));
    }
  } catch (e) {
    console.error("Failed to delete thought embeddings:", e);
  }
}

// Pastes, amplifications, and blog chunks share the same Vectorize index as
// thoughts, distinguished by id prefix so a single query can surface all kinds.

const PASTE_PREFIX = "paste-";
const AMP_PREFIX = "amp-";
const BLOG_PREFIX = "blog-";
const PASTE_CHUNK_MAX_CHARS = 1800;
const AMP_EMBED_MAX_CHARS = 1500;

export function pasteChunkVectorId(pasteId: string, chunk: number): string {
  return `${PASTE_PREFIX}${pasteId}-${chunk}`;
}

export function amplificationVectorId(ampId: number): string {
  return `${AMP_PREFIX}${ampId}`;
}

/** Vectorize IDs only allow `[A-Za-z0-9_-]`, so swap `/`, `.`, `#` for `_`. */
export function blogChunkVectorId(fileKey: string, chunk: number): string {
  const safe = fileKey.replace(/[^A-Za-z0-9_-]/g, "_");
  return `${BLOG_PREFIX}${safe}-${chunk}`;
}

/**
 * Parse a Vectorize ID into its type + ref. Handles both the legacy single-vector
 * `paste-{id}` format and the chunked `paste-{id}-{n}` format.
 */
export function classifyVectorId(
  id: string,
): { kind: "thought" | "paste" | "amplification" | "blog"; ref: string; chunk?: number } {
  if (id.startsWith(PASTE_PREFIX)) {
    const rest = id.slice(PASTE_PREFIX.length);
    const m = rest.match(/^(.+)-(\d+)$/);
    if (m) return { kind: "paste", ref: m[1], chunk: parseInt(m[2], 10) };
    return { kind: "paste", ref: rest, chunk: 0 };
  }
  if (id.startsWith(AMP_PREFIX)) return { kind: "amplification", ref: id.slice(AMP_PREFIX.length) };
  if (id.startsWith(BLOG_PREFIX)) {
    const rest = id.slice(BLOG_PREFIX.length);
    const m = rest.match(/^(.+)-(\d+)$/);
    if (m) return { kind: "blog", ref: m[1], chunk: parseInt(m[2], 10) };
    return { kind: "blog", ref: rest, chunk: 0 };
  }
  return { kind: "thought", ref: id };
}

/**
 * Split a paste into embedding-sized chunks. Prepends the title to every chunk so
 * each one carries enough context to match title-referencing queries. Splits on blank
 * lines, then hard-splits any paragraph that is itself too large.
 */
export function chunkPasteBody(title: string | null, body: string): string[] {
  const header = title ? `${title}\n\n` : "";
  if (!body.trim()) return header.trim() ? [header.trim()] : [];

  // Fast path: whole thing fits.
  if (header.length + body.length <= PASTE_CHUNK_MAX_CHARS) {
    return [(header + body).trim()];
  }

  const budget = PASTE_CHUNK_MAX_CHARS - header.length;
  const paragraphs = body.split(/\n\s*\n/);
  const packed: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (p.length > budget) {
      // Hard-split oversized paragraph.
      if (current) { packed.push(current); current = ""; }
      for (let i = 0; i < p.length; i += budget) {
        packed.push(p.slice(i, i + budget));
      }
      continue;
    }
    if ((current ? current.length + 2 : 0) + p.length > budget) {
      packed.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) packed.push(current);

  return packed.map((c) => (header + c).trim());
}

export async function upsertPasteEmbedding(
  env: Env,
  pasteId: string,
  title: string | null,
  body: string,
  createdAt: number,
): Promise<{ vec: number[] | null }> {
  try {
    const chunks = chunkPasteBody(title, body);
    if (chunks.length === 0) return { vec: null };
    const chunkVecs: number[][] = [];
    // Embed each chunk sequentially; Workers AI usually rate-limits parallel calls.
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embedText(env.AI, chunks[i]);
      chunkVecs.push(vec);
      await env.VECTORIZE.upsert([
        {
          id: pasteChunkVectorId(pasteId, i),
          values: vec,
          metadata: { kind: "paste", timestamp: createdAt, chunk: i },
        },
      ]);
    }
    // Centroid of chunk vectors = representative for clustering.
    const d = chunkVecs[0].length;
    const avg = new Array(d).fill(0);
    for (const v of chunkVecs) for (let j = 0; j < d; j++) avg[j] += v[j];
    for (let j = 0; j < d; j++) avg[j] /= chunkVecs.length;
    return { vec: avg };
  } catch (e) {
    console.error("Failed to upsert paste embedding:", e);
    return { vec: null };
  }
}

/**
 * Delete every chunk belonging to the given pastes. Callers pass the body/title so
 * the chunker can compute exactly how many chunks exist.
 * Legacy single-vector `paste-{id}` entries are also swept for back-compat.
 */
export async function deletePasteEmbeddings(
  env: Env,
  pastes: { id: string; title: string | null; body: string }[],
): Promise<void> {
  try {
    if (pastes.length === 0) return;
    const ids: string[] = [];
    for (const p of pastes) {
      const chunks = chunkPasteBody(p.title, p.body);
      for (let i = 0; i < chunks.length; i++) {
        ids.push(pasteChunkVectorId(p.id, i));
      }
      // Sweep legacy unchunked format.
      ids.push(`${PASTE_PREFIX}${p.id}`);
    }
    for (let i = 0; i < ids.length; i += 20) {
      await env.VECTORIZE.deleteByIds(ids.slice(i, i + 20));
    }
  } catch (e) {
    console.error("Failed to delete paste embeddings:", e);
  }
}

export async function upsertAmplificationEmbedding(
  env: Env,
  ampId: number,
  title: string | null,
  description: string | null,
  note: string | null,
  createdAt: number,
): Promise<{ vec: number[] | null }> {
  try {
    const text = [title ?? "", description ?? "", note ?? ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, AMP_EMBED_MAX_CHARS);
    if (!text.trim()) return { vec: null };
    const vec = await embedText(env.AI, text);
    await env.VECTORIZE.upsert([
      {
        id: amplificationVectorId(ampId),
        values: vec,
        metadata: { kind: "amplification", timestamp: createdAt },
      },
    ]);
    return { vec };
  } catch (e) {
    console.error("Failed to upsert amplification embedding:", e);
    return { vec: null };
  }
}

export async function deleteAmplificationEmbeddings(
  env: Env,
  ampIds: number[],
): Promise<void> {
  try {
    if (ampIds.length === 0) return;
    const ids = ampIds.map(amplificationVectorId);
    for (let i = 0; i < ids.length; i += 20) {
      await env.VECTORIZE.deleteByIds(ids.slice(i, i + 20));
    }
  } catch (e) {
    console.error("Failed to delete amplification embeddings:", e);
  }
}
