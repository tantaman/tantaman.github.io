#!/usr/bin/env node

/**
 * Compute a frozen PCA basis from all thought embeddings in VECTORIZE,
 * write it as constants to worker/src/color-projection.ts,
 * and backfill colors for all existing thoughts in D1.
 *
 * Uses wrangler CLI (must be authenticated via `wrangler login`).
 * Usage: node scripts/compute-thought-projection.mjs [--dry-run]
 */

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const VECTORIZE_INDEX = 'thought-embeddings';
const D1_DB = 'thought';
const DRY_RUN = process.argv.includes('--dry-run');

const WORKER_DIR = new URL('../worker', import.meta.url).pathname;

function wrangler(...args) {
  // --env-file /dev/null prevents wrangler from loading worker/.env (which may
  // contain a stale API token that overrides the OAuth session).
  const result = execFileSync('npx', ['wrangler', ...args, '--env-file', '/dev/null'], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: WORKER_DIR,
  });
  return result;
}

function wranglerJson(...args) {
  const raw = wrangler(...args);
  // wrangler may prefix non-JSON status lines — find the JSON portion
  const start = raw.indexOf('[') < raw.indexOf('{') && raw.indexOf('[') !== -1
    ? raw.indexOf('[')
    : raw.indexOf('{');
  if (start === -1) throw new Error(`No JSON in wrangler output: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start));
}

// --- Fetch all thought IDs from D1 ---
function getAllThoughtIds() {
  const result = wranglerJson('d1', 'execute', D1_DB, '--command', 'SELECT id FROM thought ORDER BY id', '--remote', '--json');
  return result[0].results.map((r) => r.id);
}

// --- Fetch all vector IDs from VECTORIZE via list-vectors pagination ---
function listAllVectorIds() {
  const ids = [];
  let cursor = undefined;
  while (true) {
    const args = ['vectorize', 'list-vectors', VECTORIZE_INDEX, '--count', '1000', '--json'];
    if (cursor) args.push('--cursor', cursor);
    const result = wranglerJson(...args);
    for (const v of result.vectors) {
      ids.push(v.id);
    }
    if (!result.isTruncated) break;
    cursor = result.nextCursor;
  }
  return ids;
}

// --- Fetch vectors by IDs ---
function getVectorsByIds(ids) {
  const args = ['vectorize', 'get-vectors', VECTORIZE_INDEX, '--ids', ...ids.map(String)];
  const raw = wrangler(...args);
  // get-vectors output has a status line prefix before the JSON array
  const start = raw.indexOf('[');
  if (start === -1) throw new Error(`No JSON array in get-vectors output: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start));
}

// --- D1 execute ---
function d1Execute(sql) {
  wrangler('d1', 'execute', D1_DB, '--command', sql, '--remote');
}

// --- PCA via power iteration (ported from pca-colors.ts) ---
function computePCA(vectors, dims = 3) {
  const n = vectors.length;
  const d = vectors[0].length;

  const mean = new Array(d).fill(0);
  for (const row of vectors) {
    for (let j = 0; j < d; j++) mean[j] += row[j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = vectors.map((row) => row.map((v, j) => v - mean[j]));

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

function formatArray(arr, indent = '') {
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

function main() {
  console.log('Listing vector IDs from VECTORIZE...');
  const vectorIds = listAllVectorIds();
  console.log(`Found ${vectorIds.length} vectors`);

  if (vectorIds.length < 3) {
    console.error('Need at least 3 vectors for PCA');
    process.exit(1);
  }

  // Fetch vectors in batches
  console.log('Fetching vectors...');
  const BATCH = 20;
  const idVecPairs = [];
  for (let i = 0; i < vectorIds.length; i += BATCH) {
    const batch = vectorIds.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(vectorIds.length / BATCH);
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);
    const result = getVectorsByIds(batch);
    for (const vec of result) {
      if (vec.values && vec.values.length > 0) {
        idVecPairs.push({ id: parseInt(vec.id, 10), values: vec.values });
      }
    }
  }

  console.log(`Got ${idVecPairs.length} vectors with values`);

  // Run PCA
  console.log('Computing PCA...');
  const vectors = idVecPairs.map((p) => p.values);
  const { mean, components, mins, maxs } = computePCA(vectors);

  console.log(`Dims: ${mean.length}, Components: ${components.length}`);
  console.log(`Ranges: [${mins.map((m, i) => `${m.toFixed(4)}..${maxs[i].toFixed(4)}`).join(', ')}]`);

  if (DRY_RUN) {
    console.log('\nDry run — not writing files or updating DB');
    // Print a few sample colors
    for (let i = 0; i < Math.min(5, idVecPairs.length); i++) {
      const color = projectToColor(idVecPairs[i].values, mean, components, mins, maxs);
      console.log(`  thought ${idVecPairs[i].id}: ${color}`);
    }
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
  writeFileSync(outPath, tsContent, 'utf-8');
  console.log('Written color-projection.ts');

  // Backfill colors for all thoughts
  console.log('\nBackfilling colors for existing thoughts...');
  let updated = 0;
  for (let i = 0; i < idVecPairs.length; i++) {
    const { id, values } = idVecPairs[i];
    const color = projectToColor(values, mean, components, mins, maxs);
    d1Execute(`UPDATE thought SET color = '${color}' WHERE id = ${id}`);
    updated++;
    if (updated % 10 === 0) {
      console.log(`  Updated ${updated}/${idVecPairs.length}...`);
    }
  }
  console.log(`Backfilled colors for ${updated} thoughts`);

  console.log('\nDone!');
}

main();
