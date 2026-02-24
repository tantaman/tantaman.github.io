// Frozen PCA basis computed over existing thought embeddings (768-dim, @cf/baai/bge-base-en-v1.5).
// Regenerate by running: node scripts/compute-thought-projection.mjs

// PLACEHOLDER — replace by running the projection script
export const MEAN: number[] = [];
export const COMPONENTS: number[][] = [[], [], []];
export const MINS: number[] = [0, 0, 0];
export const MAXS: number[] = [1, 1, 1];

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Project a 768-dim embedding to an RGB hex color using the frozen PCA basis.
 * Returns null if the basis hasn't been computed yet.
 */
export function projectToColor(embedding: number[]): string | null {
  if (MEAN.length === 0) return null;

  const d = MEAN.length;

  // Center
  const centered = new Array(d);
  for (let j = 0; j < d; j++) {
    centered[j] = embedding[j] - MEAN[j];
  }

  // Project onto each of the 3 principal components and normalize to [0, 1]
  const rgb = new Array(3);
  for (let c = 0; c < 3; c++) {
    const comp = COMPONENTS[c];
    let score = 0;
    for (let j = 0; j < d; j++) {
      score += centered[j] * comp[j];
    }
    const range = MAXS[c] - MINS[c];
    rgb[c] = range < 1e-10 ? 0.5 : clamp((score - MINS[c]) / range, 0, 1);
  }

  // Convert to hex
  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}
