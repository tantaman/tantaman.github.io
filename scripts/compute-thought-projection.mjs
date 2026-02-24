#!/usr/bin/env node

/**
 * Compute a frozen PCA basis from all thought embeddings in VECTORIZE,
 * write it as constants to worker/src/color-projection.ts,
 * and backfill colors for all existing thoughts in D1.
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN env vars
 * Usage: node scripts/compute-thought-projection.mjs [--dry-run]
 */

import { writeFile } from 'node:fs/promises';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const D1_DATABASE_ID = 'a1190a47-fe1e-4fdb-8d7a-06dd5714fc6b';
const VECTORIZE_INDEX = 'thought-embeddings';
const DRY_RUN = process.argv.includes('--dry-run');

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars required');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

async function cfApi(path, opts = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${path}`;
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CF API ${res.status}: ${body}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(`CF API error: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

async function d1Query(sql, params = []) {
  const result = await cfApi(`/d1/database/${D1_DATABASE_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ sql, params }),
  });
  return result[0];
}

// --- Fetch all thought IDs from D1 ---
async function getAllThoughtIds() {
  const result = await d1Query('SELECT id FROM thought ORDER BY id');
  return result.results.map((r) => r.id);
}

// --- Fetch vectors from VECTORIZE by IDs ---
async function getVectorsByIds(ids) {
  // VECTORIZE getByIds via REST API
  const result = await cfApi(`/vectorize/v2/indexes/${VECTORIZE_INDEX}/get_by_ids`, {
    method: 'POST',
    body: JSON.stringify({ ids: ids.map(String) }),
  });
  return result;
}

// --- PCA via power iteration (ported from pca-colors.ts) ---
function computePCA(vectors, dims = 3) {
  const n = vectors.length;
  const d = vectors[0].length;

  // Compute mean
  const mean = new Array(d).fill(0);
  for (const row of vectors) {
    for (let j = 0; j < d; j++) mean[j] += row[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  // Center
  const centered = vectors.map((row) => row.map((v, j) => v - mean[j]));

  // Extract top components via power iteration with deflation
  const components = [];
  const deflated = centered.map((row) => [...row]);

  for (let c = 0; c < dims; c++) {
    let vec = new Array(d);
    for (let j = 0; j < d; j++) vec[j] = Math.sin(j * (c + 1) * 0.1) + 0.5;

    for (let iter = 0; iter < 50; iter++) {
      const projected = deflated.map((row) =>
        row.reduce((s, v, j) => s + v * vec[j], 0),
      );
      const newVec = new Array(d).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < d; j++) newVec[j] += deflated[i][j] * projected[i];
      }
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm < 1e-10) break;
      vec = newVec.map((v) => v / norm);
    }

    components.push(vec);

    const scores = deflated.map((row) =>
      row.reduce((s, v, j) => s + v * vec[j], 0),
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) deflated[i][j] -= scores[i] * vec[j];
    }
  }

  // Compute projection scores for normalization bounds
  const rawScores = vectors.map((_, i) =>
    components.map((comp) =>
      centered[i].reduce((s, v, j) => s + v * comp[j], 0),
    ),
  );

  const mins = components.map((_, c) => Math.min(...rawScores.map((r) => r[c])));
  const maxs = components.map((_, c) => Math.max(...rawScores.map((r) => r[c])));

  return { mean, components, mins, maxs, rawScores };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function projectToColor(embedding, mean, components, mins, maxs) {
  const d = mean.length;
  const centered = new Array(d);
  for (let j = 0; j < d; j++) centered[j] = embedding[j] - mean[j];

  const rgb = new Array(3);
  for (let c = 0; c < 3; c++) {
    const comp = components[c];
    let score = 0;
    for (let j = 0; j < d; j++) score += centered[j] * comp[j];
    const range = maxs[c] - mins[c];
    rgb[c] = range < 1e-10 ? 0.5 : clamp((score - mins[c]) / range, 0, 1);
  }

  const r = Math.round(rgb[0] * 255);
  const g = Math.round(rgb[1] * 255);
  const b = Math.round(rgb[2] * 255);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

// --- Format array as compact TypeScript literal ---
function formatArray(arr, indent = '') {
  // For very long arrays (768-dim), use multi-line with ~20 values per line
  if (arr.length > 20) {
    const lines = [];
    for (let i = 0; i < arr.length; i += 16) {
      const chunk = arr.slice(i, i + 16).map((v) => v.toString());
      lines.push(indent + '  ' + chunk.join(', ') + ',');
    }
    return '[\n' + lines.join('\n') + '\n' + indent + ']';
  }
  return '[' + arr.map((v) => v.toString()).join(', ') + ']';
}

async function main() {
  console.log('Fetching thought IDs from D1...');
  const ids = await getAllThoughtIds();
  console.log(`Found ${ids.length} thoughts`);

  if (ids.length === 0) {
    console.error('No thoughts found');
    process.exit(1);
  }

  // Fetch vectors in batches (VECTORIZE getByIds limit)
  console.log('Fetching vectors from VECTORIZE...');
  const BATCH = 100;
  const idVecPairs = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(ids.length / BATCH);
    console.log(`  Batch ${batchNum}/${totalBatches}...`);
    const result = await getVectorsByIds(batch);
    for (const vec of result) {
      if (vec.values && vec.values.length > 0) {
        idVecPairs.push({ id: parseInt(vec.id, 10), values: vec.values });
      }
    }
    if (i + BATCH < ids.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`Got ${idVecPairs.length} vectors`);

  if (idVecPairs.length < 3) {
    console.error('Need at least 3 vectors for PCA');
    process.exit(1);
  }

  // Run PCA
  console.log('Computing PCA...');
  const vectors = idVecPairs.map((p) => p.values);
  const { mean, components, mins, maxs, rawScores } = computePCA(vectors);

  console.log(`Dims: ${mean.length}, Components: ${components.length}`);
  console.log(`Ranges: [${mins.map((m, i) => `${m.toFixed(4)}..${maxs[i].toFixed(4)}`).join(', ')}]`);

  if (DRY_RUN) {
    console.log('\nDry run — not writing files or updating DB');
    return;
  }

  // Write color-projection.ts
  console.log('\nWriting worker/src/color-projection.ts...');
  const tsContent = `// Frozen PCA basis computed over existing thought embeddings (768-dim, @cf/baai/bge-base-en-v1.5).
// Regenerate by running: node scripts/compute-thought-projection.mjs
// Generated: ${new Date().toISOString()}
// Corpus size: ${idVecPairs.length} thoughts

export const MEAN: number[] = ${formatArray(mean)};

export const COMPONENTS: number[][] = [
  ${formatArray(components[0], '  ')},
  ${formatArray(components[1], '  ')},
  ${formatArray(components[2], '  ')},
];

export const MINS: number[] = ${formatArray(mins)};
export const MAXS: number[] = ${formatArray(maxs)};

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
`;

  const outPath = new URL('../worker/src/color-projection.ts', import.meta.url).pathname;
  await writeFile(outPath, tsContent, 'utf-8');
  console.log('Written color-projection.ts');

  // Backfill colors for all thoughts
  console.log('\nBackfilling colors for existing thoughts...');
  let updated = 0;
  for (let i = 0; i < idVecPairs.length; i++) {
    const { id, values } = idVecPairs[i];
    const color = projectToColor(values, mean, components, mins, maxs);
    await d1Query('UPDATE thought SET color = ? WHERE id = ?', [color, id]);
    updated++;
    if (updated % 50 === 0) {
      console.log(`  Updated ${updated}/${idVecPairs.length}...`);
    }
  }
  console.log(`Backfilled colors for ${updated} thoughts`);

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
