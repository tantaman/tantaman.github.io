import { UMAP } from 'umap-js';

export interface ProjectedPoint {
  id: number;
  x: number;
  y: number;
}

export function projectEmbeddings(
  ids: number[],
  embeddings: Record<string, number[]>,
): ProjectedPoint[] {
  const validIds: number[] = [];
  const vectors: number[][] = [];

  for (const id of ids) {
    const vec = embeddings[String(id)];
    if (vec) {
      validIds.push(id);
      vectors.push(vec);
    }
  }

  if (vectors.length < 2) {
    return validIds.map((id, i) => ({ id, x: 0.5, y: 0.5 }));
  }

  const n = vectors.length;
  const nNeighbors = Math.min(15, Math.floor(n / 2));

  const umap = new UMAP({
    nNeighbors,
    nComponents: 2,
    minDist: 0.1,
    spread: 1.0,
  });

  const projected = umap.fit(vectors);

  // Normalize to [0, 1]
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of projected) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return validIds.map((id, i) => ({
    id,
    x: (projected[i][0] - minX) / rangeX,
    y: (projected[i][1] - minY) / rangeY,
  }));
}
