import fs from 'fs/promises';
import path from 'path';

/**
 * Load embeddings from the relationships cache.
 * Returns Map<filename, number[]> where filename includes collection prefix.
 */
export async function loadEmbeddings(): Promise<Map<string, number[]>> {
  const cachePath = path.join(process.cwd(), '.relationships-cache.json');
  const raw = await fs.readFile(cachePath, 'utf-8');
  const cache = JSON.parse(raw);
  return new Map(Object.entries(cache.embeddings ?? {}));
}

/**
 * PCA projection via power iteration.
 * Projects high-dimensional embeddings down to `dims` dimensions,
 * normalized to [0, 1] per component.
 */
export function pcaProject(
  embeddings: Map<string, number[]>,
  dims = 3,
): Map<string, number[]> {
  const keys = [...embeddings.keys()];
  const matrix = keys.map((k) => embeddings.get(k)!);
  const n = matrix.length;
  if (n === 0) return new Map();
  const d = matrix[0].length;

  // Center the data
  const mean = new Array(d).fill(0);
  for (const row of matrix) for (let j = 0; j < d; j++) mean[j] += row[j];
  for (let j = 0; j < d; j++) mean[j] /= n;
  const centered = matrix.map((row) => row.map((v, j) => v - mean[j]));

  // Extract top `dims` components via power iteration with deflation
  const components: number[][] = [];
  const deflated = centered.map((row) => [...row]);

  for (let c = 0; c < dims; c++) {
    // Initialize random-ish vector (deterministic seed)
    let vec = new Array(d);
    for (let j = 0; j < d; j++) vec[j] = Math.sin(j * (c + 1) * 0.1) + 0.5;

    // Power iteration: 50 iterations is more than enough for convergence
    for (let iter = 0; iter < 50; iter++) {
      // Multiply: X^T * X * vec
      const projected = deflated.map((row) =>
        row.reduce((s, v, j) => s + v * vec[j], 0),
      );
      const newVec = new Array(d).fill(0);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < d; j++) newVec[j] += deflated[i][j] * projected[i];

      // Normalize
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm < 1e-10) break;
      vec = newVec.map((v) => v / norm);
    }

    components.push(vec);

    // Deflate: remove this component from the data
    const scores = deflated.map((row) =>
      row.reduce((s, v, j) => s + v * vec[j], 0),
    );
    for (let i = 0; i < n; i++)
      for (let j = 0; j < d; j++) deflated[i][j] -= scores[i] * vec[j];
  }

  // Project each point onto the components
  const raw = keys.map((_, i) =>
    components.map((comp) =>
      centered[i].reduce((s, v, j) => s + v * comp[j], 0),
    ),
  );

  // Normalize each dimension to [0, 1]
  const mins = components.map((_, c) =>
    Math.min(...raw.map((r) => r[c])),
  );
  const maxs = components.map((_, c) =>
    Math.max(...raw.map((r) => r[c])),
  );

  const result = new Map<string, number[]>();
  for (let i = 0; i < keys.length; i++) {
    result.set(
      keys[i],
      raw[i].map((v, c) => {
        const range = maxs[c] - mins[c];
        return range < 1e-10 ? 0.5 : (v - mins[c]) / range;
      }),
    );
  }

  return result;
}

/**
 * Convert a [0-1, 0-1, 0-1] triple to a hex color string.
 */
export function toRgbHex(projected: number[]): string {
  const r = Math.round(projected[0] * 255);
  const g = Math.round(projected[1] * 255);
  const b = Math.round(projected[2] * 255);
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}
