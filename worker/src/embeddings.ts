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
