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
): Promise<string | null> {
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
    return color;
  } catch (e) {
    console.error("Failed to upsert thought embedding:", e);
    return null;
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

// Pastes and amplifications share the same Vectorize index as thoughts,
// distinguished by id prefix so a single query can surface all three types.

const PASTE_PREFIX = "paste-";
const AMP_PREFIX = "amp-";
const PASTE_EMBED_MAX_CHARS = 2000;
const AMP_EMBED_MAX_CHARS = 1500;

export function pasteVectorId(pasteId: string): string {
  return `${PASTE_PREFIX}${pasteId}`;
}

export function amplificationVectorId(ampId: number): string {
  return `${AMP_PREFIX}${ampId}`;
}

export function classifyVectorId(id: string): { kind: "thought" | "paste" | "amplification"; ref: string } {
  if (id.startsWith(PASTE_PREFIX)) return { kind: "paste", ref: id.slice(PASTE_PREFIX.length) };
  if (id.startsWith(AMP_PREFIX)) return { kind: "amplification", ref: id.slice(AMP_PREFIX.length) };
  return { kind: "thought", ref: id };
}

export async function upsertPasteEmbedding(
  env: Env,
  pasteId: string,
  title: string | null,
  body: string,
  createdAt: number,
): Promise<void> {
  try {
    const text = [title ?? "", body.slice(0, PASTE_EMBED_MAX_CHARS)].filter(Boolean).join("\n\n");
    if (!text.trim()) return;
    const vec = await embedText(env.AI, text);
    await env.VECTORIZE.upsert([
      {
        id: pasteVectorId(pasteId),
        values: vec,
        metadata: { kind: "paste", timestamp: createdAt },
      },
    ]);
  } catch (e) {
    console.error("Failed to upsert paste embedding:", e);
  }
}

export async function deletePasteEmbeddings(
  env: Env,
  pasteIds: string[],
): Promise<void> {
  try {
    if (pasteIds.length === 0) return;
    const ids = pasteIds.map(pasteVectorId);
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
): Promise<void> {
  try {
    const text = [title ?? "", description ?? "", note ?? ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, AMP_EMBED_MAX_CHARS);
    if (!text.trim()) return;
    const vec = await embedText(env.AI, text);
    await env.VECTORIZE.upsert([
      {
        id: amplificationVectorId(ampId),
        values: vec,
        metadata: { kind: "amplification", timestamp: createdAt },
      },
    ]);
  } catch (e) {
    console.error("Failed to upsert amplification embedding:", e);
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
