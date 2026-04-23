#!/usr/bin/env node

/**
 * Cluster thoughts + pastes + amplifications by their embeddings into K groups.
 * Writes cluster labels + per-item soft memberships (top-5) to D1, centroids + 2D
 * UMAP positions to KV.
 *
 * Usage:
 *   node scripts/compute-clusters.mjs [--k 15] [--dry-run] [--llm-labels]
 *   node scripts/compute-clusters.mjs --positions-only
 *
 * --positions-only skips k-means, labeling, and D1 writes. It only fetches vectors,
 * runs UMAP, and writes `graph:positions` to KV. Useful when you just want to update
 * the graph layout without touching existing clusters.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UMAP } from 'umap-js';

const VECTORIZE_INDEX = 'thought-embeddings';
const D1_DB = 'thought';
const KV_BINDING = 'KV';

const DRY_RUN = process.argv.includes('--dry-run');
const LLM_LABELS = process.argv.includes('--llm-labels');
const POSITIONS_ONLY = process.argv.includes('--positions-only');
const K_ARG = process.argv.indexOf('--k');
const K = K_ARG !== -1 ? parseInt(process.argv[K_ARG + 1], 10) : 15;
const TOP_K = 5;
const MIN_CLUSTER_SIZE = 3;

const WORKER_DIR = new URL('../worker', import.meta.url).pathname;

function wrangler(...args) {
  return execFileSync('npx', ['wrangler', ...args, '--env-file', '/dev/null'], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: WORKER_DIR,
  });
}

function wranglerJson(...args) {
  const raw = wrangler(...args);
  const start = raw.indexOf('[') < raw.indexOf('{') && raw.indexOf('[') !== -1
    ? raw.indexOf('[')
    : raw.indexOf('{');
  if (start === -1) throw new Error(`No JSON in wrangler output: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start));
}

function d1Query(sql) {
  const result = wranglerJson('d1', 'execute', D1_DB, '--command', sql, '--remote', '--json');
  return result[0].results;
}

function d1Execute(sql) {
  // Use stdin to avoid arg-length limits for big batch INSERTs.
  const tmp = mkdtempSync(join(tmpdir(), 'clusters-'));
  const file = join(tmp, 'batch.sql');
  writeFileSync(file, sql, 'utf-8');
  try {
    wrangler('d1', 'execute', D1_DB, '--file', file, '--remote');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function listAllVectorIds() {
  const ids = [];
  let cursor;
  while (true) {
    const args = ['vectorize', 'list-vectors', VECTORIZE_INDEX, '--count', '1000', '--json'];
    if (cursor) args.push('--cursor', cursor);
    const result = wranglerJson(...args);
    for (const v of result.vectors) ids.push(v.id);
    if (!result.isTruncated) break;
    cursor = result.nextCursor;
  }
  return ids;
}

function getVectorsByIds(ids) {
  const args = ['vectorize', 'get-vectors', VECTORIZE_INDEX, '--ids', ...ids.map(String)];
  const raw = wrangler(...args);
  const start = raw.indexOf('[');
  if (start === -1) throw new Error(`No JSON array in get-vectors output: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start));
}

// Classify a Vectorize ID. Mirror worker/src/embeddings.ts classifyVectorId.
function classifyId(id) {
  if (id.startsWith('paste-')) {
    const rest = id.slice('paste-'.length);
    const m = rest.match(/^(.+)-(\d+)$/);
    if (m) return { kind: 'paste', ref: m[1], chunk: parseInt(m[2], 10) };
    return { kind: 'paste', ref: rest, chunk: 0 };
  }
  if (id.startsWith('amp-')) return { kind: 'amplification', ref: id.slice('amp-'.length) };
  return { kind: 'thought', ref: id };
}

function sqlString(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function truncate(s, n) {
  if (!s) return '';
  const collapsed = s.replace(/\s+/g, ' ').trim();
  return collapsed.length <= n ? collapsed : collapsed.slice(0, n - 1).trimEnd() + '…';
}

function normalize(vec) {
  let n = 0;
  for (const v of vec) n += v * v;
  const norm = Math.sqrt(n);
  if (norm < 1e-10) return vec;
  const out = new Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

function averageVectors(vecs) {
  const d = vecs[0].length;
  const out = new Array(d).fill(0);
  for (const v of vecs) for (let j = 0; j < d; j++) out[j] += v[j];
  for (let j = 0; j < d; j++) out[j] /= vecs.length;
  return normalize(out);
}

function distance(a, b) {
  let s = 0;
  for (let j = 0; j < a.length; j++) {
    const d = a[j] - b[j];
    s += d * d;
  }
  return Math.sqrt(s);
}

// k-means++ seed + Lloyd iterations.
function kmeans(points, k, maxIter = 50) {
  const d = points[0].length;
  const n = points.length;
  if (n <= k) return points.map((p) => p.slice());

  // k-means++ init
  const rng = mulberry32(0xc0ffee);
  const centroids = [points[Math.floor(rng() * n)].slice()];
  while (centroids.length < k) {
    const dists = points.map((p) => {
      let best = Infinity;
      for (const c of centroids) {
        const d = distance(p, c);
        if (d < best) best = d;
      }
      return best * best;
    });
    const total = dists.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let picked = 0;
    for (let i = 0; i < n; i++) {
      r -= dists[i];
      if (r <= 0) { picked = i; break; }
    }
    centroids.push(points[picked].slice());
  }

  const assignments = new Array(n).fill(-1);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = distance(points[i], centroids[0]);
      for (let c = 1; c < k; c++) {
        const dc = distance(points[i], centroids[c]);
        if (dc < bestDist) { bestDist = dc; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed++; }
    }
    if (changed === 0) break;

    const sums = Array.from({ length: k }, () => new Array(d).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      counts[c]++;
      const row = points[i];
      for (let j = 0; j < d; j++) sums[c][j] += row[j];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) {
        // Re-seed empty cluster from the farthest point.
        let farthest = 0;
        let farDist = 0;
        for (let i = 0; i < n; i++) {
          const dc = distance(points[i], centroids[assignments[i]]);
          if (dc > farDist) { farDist = dc; farthest = i; }
        }
        centroids[c] = points[farthest].slice();
      } else {
        for (let j = 0; j < d; j++) sums[c][j] /= counts[c];
        centroids[c] = normalize(sums[c]);
      }
    }
  }

  return centroids;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Nearest top-K centroids (by distance ascending) for a point.
function topKCentroids(point, centroids, k) {
  const scored = centroids.map((c, i) => ({ i, dist: distance(point, c) }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, k);
}

// --- TF-IDF bigram labeling ---

const STOPWORDS = new Set(['the','a','an','and','or','but','if','then','of','in','on','at','to','for','with','by','from','as','is','are','was','were','be','been','being','have','has','had','do','does','did','this','that','these','those','it','its','i','me','my','mine','we','us','our','ours','you','your','yours','he','him','his','she','her','hers','they','them','their','theirs','not','no','yes','so','just','really','like','very','too','also','about','up','down','out','over','under','again','more','most','some','any','all','can','could','would','should','will','shall','may','might','must','than','then','now','here','there','when','where','why','how','what','who','whom','which','whose','because','even','still','much','many','few','one','two','per','via','etc']);
const PROJECT_STOPLIST = new Set(['thought','thoughts','idea','ideas','thing','things','stuff','note','notes','bit','way','ways','kind','kinds','sort','sorts','feel','feels','felt','think','thinks','thought','really','actually','basically','mostly','kinda','maybe','pretty','quite','seem','seems','seemed','see','saw','seen','make','makes','made','get','gets','got','gotten','take','takes','took','taken','let','go','goes','went','gone','come','comes','came']);

function tokenize(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/).filter(Boolean);
}

function termFrequencies(text) {
  const tokens = tokenize(text).filter((t) => t.length > 2 && !STOPWORDS.has(t) && !PROJECT_STOPLIST.has(t));
  const unigrams = new Map();
  for (const t of tokens) unigrams.set(t, (unigrams.get(t) ?? 0) + 1);
  const bigrams = new Map();
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = tokens[i] + ' ' + tokens[i + 1];
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }
  return { unigrams, bigrams };
}

function labelClusters(clusters, itemTexts) {
  // DF counts across entire corpus (both uni and bi).
  const docFreqU = new Map();
  const docFreqB = new Map();
  for (const text of itemTexts) {
    const { unigrams, bigrams } = termFrequencies(text);
    for (const t of unigrams.keys()) docFreqU.set(t, (docFreqU.get(t) ?? 0) + 1);
    for (const t of bigrams.keys()) docFreqB.set(t, (docFreqB.get(t) ?? 0) + 1);
  }
  const N = itemTexts.length;

  return clusters.map((members) => {
    const termScoresU = new Map();
    const termScoresB = new Map();
    for (const idx of members) {
      const { unigrams, bigrams } = termFrequencies(itemTexts[idx]);
      for (const [t, tf] of unigrams) {
        const df = docFreqU.get(t) ?? 1;
        termScoresU.set(t, (termScoresU.get(t) ?? 0) + tf * Math.log(N / df));
      }
      for (const [t, tf] of bigrams) {
        const df = docFreqB.get(t) ?? 1;
        termScoresB.set(t, (termScoresB.get(t) ?? 0) + tf * Math.log(N / df));
      }
    }
    // Prefer bigrams, fall back to unigrams.
    const bigramTop = [...termScoresB.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]);
    const unigramTop = [...termScoresU.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]);
    const terms = bigramTop.length >= 1 ? [...bigramTop, ...unigramTop.filter((u) => !bigramTop.some((b) => b.includes(u)))].slice(0, 3) : unigramTop;
    return terms.length ? terms.join(' · ') : '(untitled)';
  });
}

async function llmLabelClusters(clusters, items) {
  // Only import Anthropic lazily — some runs don't need it.
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for --llm-labels');
  const client = new Anthropic({ apiKey });
  const labels = [];
  for (let i = 0; i < clusters.length; i++) {
    const members = clusters[i].slice(0, 8).map((idx) => items[idx]);
    const sample = members.map((m) => `- ${truncate(m.text, 200)}`).join('\n');
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `Give a 2-5 word topical label for this cluster of notes. Only output the label, no quotes, no preamble.\n\n${sample}`,
      }],
    });
    const text = resp.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    labels.push(text || `Cluster ${i + 1}`);
    console.log(`  cluster ${i + 1}: ${labels[i]}`);
  }
  return labels;
}

async function main() {
  console.log('Fetching items from D1...');
  const thoughts = d1Query(
    "SELECT id, body FROM thought WHERE superseded_by IS NULL AND body IS NOT NULL AND TRIM(body) <> ''",
  );
  const pastes = d1Query(
    "SELECT p.id, p.title, p.body FROM paste p WHERE NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id)",
  );
  const amps = d1Query(
    "SELECT id, title, description, note FROM amplification",
  );
  console.log(`  ${thoughts.length} thoughts, ${pastes.length} pastes (leaves), ${amps.length} amplifications`);

  console.log('Listing all Vectorize IDs...');
  const allVecIds = listAllVectorIds();

  // Filter to IDs relevant to this run; group paste chunks together.
  const thoughtIds = new Set(thoughts.map((t) => String(t.id)));
  const ampIdSet = new Set(amps.map((a) => String(a.id)));
  const pasteIdSet = new Set(pastes.map((p) => String(p.id)));

  const wantedIds = [];
  const pasteChunkIdsByPaste = new Map();
  for (const vid of allVecIds) {
    const c = classifyId(vid);
    if (c.kind === 'thought' && thoughtIds.has(c.ref)) wantedIds.push(vid);
    else if (c.kind === 'amplification' && ampIdSet.has(c.ref)) wantedIds.push(vid);
    else if (c.kind === 'paste' && pasteIdSet.has(c.ref)) {
      if (!pasteChunkIdsByPaste.has(c.ref)) pasteChunkIdsByPaste.set(c.ref, []);
      pasteChunkIdsByPaste.get(c.ref).push(vid);
      wantedIds.push(vid);
    }
  }
  console.log(`  ${wantedIds.length} wanted vector IDs`);

  console.log('Fetching vectors in batches of 20...');
  const vectorsById = new Map();
  for (let i = 0; i < wantedIds.length; i += 20) {
    const batch = wantedIds.slice(i, i + 20);
    const result = getVectorsByIds(batch);
    for (const v of result) {
      if (v.values && v.values.length) vectorsById.set(v.id, v.values);
    }
    if ((i / 20 + 1) % 5 === 0) console.log(`    ${i + batch.length}/${wantedIds.length}`);
  }

  // Build item list: one representative vector per item.
  const items = [];
  for (const t of thoughts) {
    const v = vectorsById.get(String(t.id));
    if (!v) continue;
    items.push({ kind: 'thought', id: String(t.id), text: t.body ?? '', vec: normalize(v) });
  }
  for (const a of amps) {
    const v = vectorsById.get(`amp-${a.id}`);
    if (!v) continue;
    const text = [a.title, a.description, a.note].filter(Boolean).join('\n');
    items.push({ kind: 'amplification', id: String(a.id), text, vec: normalize(v) });
  }
  for (const p of pastes) {
    const chunkIds = pasteChunkIdsByPaste.get(String(p.id)) ?? [];
    const vecs = chunkIds.map((id) => vectorsById.get(id)).filter(Boolean);
    if (!vecs.length) continue;
    const rep = vecs.length === 1 ? normalize(vecs[0]) : averageVectors(vecs);
    const text = [p.title, p.body].filter(Boolean).join('\n');
    items.push({ kind: 'paste', id: String(p.id), text, vec: rep });
  }

  const vectors = items.map((it) => it.vec);

  if (POSITIONS_ONLY) {
    console.log('\nRunning UMAP (positions-only mode)...');
    const positions = computePositions(items, vectors);
    if (DRY_RUN) {
      console.log('Dry run — not writing KV.');
      for (let i = 0; i < Math.min(3, positions.length); i++) {
        console.log(`  ${positions[i].key} → [${positions[i].x.toFixed(3)}, ${positions[i].y.toFixed(3)}]`);
      }
      return;
    }
    writePositionsKV(positions);
    console.log('Done.');
    return;
  }

  console.log(`\nClustering ${items.length} items into K=${K}...`);
  let centroids = kmeans(vectors, K, 50);

  // Hard-assign for label generation + size counts.
  function assign(vec, ctrs) {
    let best = 0, bestDist = distance(vec, ctrs[0]);
    for (let c = 1; c < ctrs.length; c++) {
      const d = distance(vec, ctrs[c]);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    return best;
  }
  let membersByCluster = centroids.map(() => []);
  for (let i = 0; i < items.length; i++) membersByCluster[assign(vectors[i], centroids)].push(i);

  // Drop small clusters — reassign members, drop centroid.
  {
    const smallIdx = new Set();
    for (let c = 0; c < centroids.length; c++) {
      if (membersByCluster[c].length < MIN_CLUSTER_SIZE) smallIdx.add(c);
    }
    if (smallIdx.size > 0) {
      console.log(`  dropping ${smallIdx.size} tiny clusters`);
      const kept = centroids.filter((_, c) => !smallIdx.has(c));
      centroids = kept;
      membersByCluster = centroids.map(() => []);
      for (let i = 0; i < items.length; i++) membersByCluster[assign(vectors[i], centroids)].push(i);
    }
  }
  console.log(`  ${centroids.length} final clusters, sizes: ${membersByCluster.map((m) => m.length).join(', ')}`);

  console.log('\nGenerating labels...');
  let labels;
  if (LLM_LABELS) labels = await llmLabelClusters(membersByCluster, items);
  else labels = labelClusters(membersByCluster, items.map((it) => it.text));
  for (let c = 0; c < labels.length; c++) console.log(`  cluster ${c + 1}: ${labels[c]} (n=${membersByCluster[c].length})`);

  // Compute soft memberships (top-5 per item).
  console.log('\nComputing top-5 soft memberships...');
  const memberships = items.map((it, i) => ({
    item: it,
    tops: topKCentroids(vectors[i], centroids, Math.min(TOP_K, centroids.length)),
  }));

  if (DRY_RUN) {
    console.log('\n--- DRY RUN — not writing DB or KV ---');
    console.log('Sample label assignments:');
    for (let i = 0; i < Math.min(5, memberships.length); i++) {
      const m = memberships[i];
      console.log(`  ${m.item.kind}:${m.item.id} — ${m.tops.map((t) => labels[t.i]).join(' / ')}`);
    }
    return;
  }

  console.log('\nWriting cluster rows to D1...');
  const nowSec = Math.floor(Date.now() / 1000);
  // Delete everything first, then insert. Wrap in a single batch.
  const sqlParts = [
    'DELETE FROM cluster_membership;',
    'DELETE FROM cluster;',
  ];
  for (let c = 0; c < labels.length; c++) {
    sqlParts.push(`INSERT INTO cluster (id, label, size, created_at) VALUES (${c + 1}, ${sqlString(labels[c])}, ${membersByCluster[c].length}, ${nowSec});`);
  }
  d1Execute(sqlParts.join('\n'));

  console.log('Writing cluster_membership rows (in batches of 100)...');
  const rows = [];
  for (const m of memberships) {
    const title = titleOf(m.item);
    const preview = truncate(m.item.text, 200);
    for (let r = 0; r < m.tops.length; r++) {
      const { i: clusterIdx, dist } = m.tops[r];
      rows.push(`(${sqlString(m.item.kind)}, ${sqlString(m.item.id)}, ${clusterIdx + 1}, ${r}, ${dist}, ${sqlString(title)}, ${sqlString(preview)})`);
    }
  }
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    d1Execute(`INSERT INTO cluster_membership (item_kind, item_id, cluster_id, rank, distance, title, preview) VALUES\n${batch.join(',\n')};`);
    console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log('\nWriting centroids + version to KV...');
  const kvPayload = {
    version: nowSec,
    k: centroids.length,
    centroids, // array of arrays
    labels: labels.map((label, idx) => ({ id: idx + 1, label, size: membersByCluster[idx].length })),
  };
  const tmp = mkdtempSync(join(tmpdir(), 'clusters-kv-'));
  const kvFile = join(tmp, 'clusters-data.json');
  try {
    writeFileSync(kvFile, JSON.stringify(kvPayload), 'utf-8');
    wrangler('kv', 'key', 'put', '--binding', KV_BINDING, 'clusters:data', '--path', kvFile, '--remote');
    wrangler('kv', 'key', 'put', '--binding', KV_BINDING, 'clusters:version', String(nowSec), '--remote');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  console.log('\nRunning UMAP for graph positions...');
  const positions = computePositions(items, vectors);
  writePositionsKV(positions);

  console.log('\nDone.');
}

function computePositions(items, vectors) {
  if (vectors.length < 2) {
    return items.map((it) => ({ key: `${it.kind}:${it.id}`, x: 0.5, y: 0.5 }));
  }
  const nNeighbors = Math.min(15, Math.floor(vectors.length / 2));
  const umap = new UMAP({ nNeighbors, nComponents: 2, minDist: 0.1, spread: 1.0 });
  const projected = umap.fit(vectors);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of projected) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return items.map((it, i) => ({
    key: `${it.kind}:${it.id}`,
    x: (projected[i][0] - minX) / rangeX,
    y: (projected[i][1] - minY) / rangeY,
  }));
}

function writePositionsKV(positions) {
  const payload = {};
  for (const p of positions) payload[p.key] = [p.x, p.y];
  const tmp = mkdtempSync(join(tmpdir(), 'graph-pos-'));
  const file = join(tmp, 'positions.json');
  try {
    writeFileSync(file, JSON.stringify({ version: Math.floor(Date.now() / 1000), positions: payload }), 'utf-8');
    wrangler('kv', 'key', 'put', '--binding', KV_BINDING, 'graph:positions', '--path', file, '--remote');
    console.log(`  wrote ${positions.length} positions`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function titleOf(item) {
  if (item.kind === 'paste') {
    const first = item.text.split('\n')[0] ?? '';
    return truncate(first, 80) || '(untitled paste)';
  }
  if (item.kind === 'amplification') {
    const first = item.text.split('\n')[0] ?? '';
    return truncate(first, 80) || '(untitled amp)';
  }
  // thought
  return truncate(item.text, 80);
}

main().catch((e) => { console.error(e); process.exit(1); });
