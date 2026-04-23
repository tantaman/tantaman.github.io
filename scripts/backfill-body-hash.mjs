#!/usr/bin/env node

/**
 * One-shot backfill: compute body_hash for every existing thought row.
 *
 * Assumes migration 0036 has been applied so `body_hash` column exists.
 *
 * Uses wrangler CLI (must be authenticated via `wrangler login`).
 * Usage:
 *   node scripts/backfill-body-hash.mjs           # remote (production D1)
 *   node scripts/backfill-body-hash.mjs --local   # local dev D1
 *   node scripts/backfill-body-hash.mjs --dry-run # preview only
 */

import { writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const D1_DB = 'thought';
const DRY_RUN = process.argv.includes('--dry-run');
const LOCAL = process.argv.includes('--local');
const WHICH = LOCAL ? '--local' : '--remote';
const BATCH_SIZE = 200;

const WORKER_DIR = new URL('../worker', import.meta.url).pathname;

function wrangler(...args) {
  return execFileSync('npx', ['wrangler', ...args, '--env-file', '/dev/null'], {
    encoding: 'utf-8',
    maxBuffer: 200 * 1024 * 1024,
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

function normalizeBody(body) {
  return body.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hashBody(body) {
  return createHash('sha256').update(normalizeBody(body)).digest('hex');
}

function fetchThoughtsMissingHash() {
  const result = wranglerJson(
    'd1', 'execute', D1_DB,
    '--command', 'SELECT id, body FROM thought WHERE body_hash IS NULL ORDER BY id',
    WHICH, '--json',
  );
  return result[0].results;
}

function applyBatch(updates) {
  const sql = updates
    .map((u) => `UPDATE thought SET body_hash = '${u.hash}' WHERE id = ${u.id};`)
    .join('\n');
  const path = join(tmpdir(), `backfill-body-hash-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(path, sql, 'utf-8');
  try {
    wrangler('d1', 'execute', D1_DB, '--file', path, WHICH);
  } finally {
    unlinkSync(path);
  }
}

function main() {
  console.log(`Fetching thoughts missing body_hash (${LOCAL ? 'local' : 'remote'})...`);
  const rows = fetchThoughtsMissingHash();
  console.log(`Found ${rows.length} thoughts to backfill`);

  if (rows.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const updates = rows.map((r) => ({ id: r.id, hash: hashBody(r.body) }));

  if (DRY_RUN) {
    console.log('\nDry run — showing first 10:');
    for (const u of updates.slice(0, 10)) {
      console.log(`  ${u.id}: ${u.hash}`);
    }
    return;
  }

  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    applyBatch(batch);
    done += batch.length;
    console.log(`  Updated ${done}/${updates.length}`);
  }

  console.log('Done.');
}

main();
