#!/usr/bin/env node

/**
 * Vectorize cleanup for the stable-row thought migration (0050/0051).
 *
 * The chain collapse (0051) deletes superseded thought rows from D1, leaving
 * their embeddings orphaned in the `thought-embeddings` Vectorize index. Those
 * orphans waste topK slots in search and never resolve to a row. This script
 * GCs them: it deletes every thought-kind vector (numeric id) whose id is no
 * longer a live row in D1.
 *
 * Safe to run any time after 0051 (and idempotent). It never touches paste-/
 * amp-/blog- prefixed vectors, and never deletes a vector that still has a row.
 *
 * Uses the wrangler CLI (must be authenticated via `wrangler login`).
 * Usage: node scripts/collapse-thought-vectors.mjs [--dry-run]
 */

import { execFileSync } from 'node:child_process';

const VECTORIZE_INDEX = 'thought-embeddings';
const D1_DB = 'thought';
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_BATCH = 100;

const WORKER_DIR = new URL('../worker', import.meta.url).pathname;

function wrangler(...args) {
  // Use the globally-installed, `wrangler login`-authed CLI and ignore
  // worker/.env (--env-file /dev/null) plus any inherited CLOUDFLARE_API_TOKEN,
  // so the OAuth session is used rather than the under-permissioned .env token.
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  return execFileSync('wrangler', [...args, '--env-file', '/dev/null'], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: WORKER_DIR,
    env,
  });
}

function wranglerJson(...args) {
  const raw = wrangler(...args);
  const sq = raw.indexOf('[');
  const cu = raw.indexOf('{');
  const start = sq !== -1 && (sq < cu || cu === -1) ? sq : cu;
  if (start === -1) throw new Error(`No JSON in wrangler output: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start));
}

function getLiveThoughtIds() {
  const result = wranglerJson('d1', 'execute', D1_DB, '--command', 'SELECT id FROM thought', '--remote', '--json');
  return new Set(result[0].results.map((r) => String(r.id)));
}

function listAllVectorIds() {
  const ids = [];
  let cursor = undefined;
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

function main() {
  console.log('Listing vectors in', VECTORIZE_INDEX, '...');
  const vectorIds = listAllVectorIds();
  console.log(`  ${vectorIds.length} vectors total`);

  console.log('Loading live thought ids from D1...');
  const live = getLiveThoughtIds();
  console.log(`  ${live.size} live thoughts`);

  // Only thought vectors are bare numeric ids; paste-/amp-/blog- are namespaced.
  const orphans = vectorIds.filter((id) => /^\d+$/.test(id) && !live.has(id));
  console.log(`\n${orphans.length} orphaned thought vectors to delete.`);

  if (orphans.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (DRY_RUN) {
    console.log('Dry run — would delete:', orphans.slice(0, 50).join(', ') + (orphans.length > 50 ? ' …' : ''));
    return;
  }

  let deleted = 0;
  for (let i = 0; i < orphans.length; i += DELETE_BATCH) {
    const batch = orphans.slice(i, i + DELETE_BATCH);
    wrangler('vectorize', 'delete-vectors', VECTORIZE_INDEX, '--ids', ...batch);
    deleted += batch.length;
    console.log(`  deleted ${deleted}/${orphans.length}`);
  }
  console.log('\nDone.');
}

main();
