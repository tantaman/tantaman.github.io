import type { Env } from "./index";

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
): Promise<void> {
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
  } catch (e) {
    console.error("Failed to upsert thought embedding:", e);
  }
}

export async function deleteThoughtEmbeddings(
  env: Env,
  ids: (string | number)[]
): Promise<void> {
  try {
    if (ids.length === 0) return;
    await env.VECTORIZE.deleteByIds(ids.map(String));
  } catch (e) {
    console.error("Failed to delete thought embeddings:", e);
  }
}
