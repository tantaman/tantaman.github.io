#!/usr/bin/env node
/**
 * Sync published documents from D1 into content/ as markdown files.
 *
 * For each `document` row with status='published' that has a slug, this
 * writes `content/<slug>.md` with YAML frontmatter. A manifest at
 * `.synced-posts.json` tracks the slugs we manage so subsequent runs can
 * delete files for documents that were unpublished or deleted.
 *
 * Run via `pnpm sync-posts` (or directly: `node scripts/sync-published-documents.mjs`).
 * Reads `API_BASE` env var (default: https://tantaman.com/api).
 *
 * No auth is required: published documents are public via the API.
 */

import fs from 'fs/promises';
import path from 'path';

const API_BASE = process.env.API_BASE || 'https://tantaman.com/api';
const CONTENT_DIR = path.resolve('./content');
const MANIFEST_PATH = path.resolve('./.synced-posts.json');

async function readManifest() {
  try {
    const data = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return new Set(parsed.slugs || []);
  } catch {
    return new Set();
  }
}

async function writeManifest(slugs) {
  const sorted = [...slugs].sort();
  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify({ slugs: sorted }, null, 2) + '\n',
  );
}

function yamlScalar(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const s = String(value);
  // Quote if it contains anything that might be misparsed in YAML.
  if (/^[\w./-]+$/.test(s) && !/^(yes|no|true|false|null)$/i.test(s)) return s;
  return JSON.stringify(s);
}

function formatFrontmatter(fm) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}: [${value.map(yamlScalar).join(', ')}]`);
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function epochToIsoDate(epoch) {
  return new Date(epoch * 1000).toISOString().slice(0, 10);
}

async function fetchPublished() {
  const r = await fetch(`${API_BASE}/documents?status=published&limit=500`);
  if (!r.ok) throw new Error(`List failed: ${r.status} ${r.statusText}`);
  const data = await r.json();
  return data.documents || [];
}

async function fetchOne(id) {
  const r = await fetch(`${API_BASE}/documents/${id}`);
  if (!r.ok) throw new Error(`Get ${id} failed: ${r.status} ${r.statusText}`);
  return r.json();
}

async function main() {
  const oldSlugs = await readManifest();
  const summaries = await fetchPublished();
  console.log(`Fetched ${summaries.length} published documents from ${API_BASE}.`);

  const newSlugs = new Set();
  for (const s of summaries) {
    if (!s.slug) {
      console.warn(`  ! skipping doc #${s.id} (${s.title}) — no slug set`);
      continue;
    }
    const doc = await fetchOne(s.id);
    const fm = doc.frontmatter || {};
    const merged = {
      title: doc.title,
      date: fm.date || epochToIsoDate(doc.created_at),
      ...fm,
      _synced_doc_id: doc.id,
    };
    const content = formatFrontmatter(merged) + '\n' + (doc.body || '').replace(/\s*$/, '') + '\n';
    const filePath = path.join(CONTENT_DIR, `${doc.slug}.md`);
    // Refuse to overwrite a hand-written file we don't already manage.
    if (!oldSlugs.has(doc.slug)) {
      try {
        await fs.access(filePath);
        console.error(
          `\nERROR: content/${doc.slug}.md exists but is not tracked in .synced-posts.json.\n` +
          `Refusing to overwrite a hand-authored file. Resolve the slug collision (rename the file or pick a different slug for doc #${doc.id}) and re-run.`,
        );
        process.exit(2);
      } catch {
        // Doesn't exist — safe to write.
      }
    }
    await fs.writeFile(filePath, content);
    newSlugs.add(doc.slug);
    console.log(`  + content/${doc.slug}.md`);
  }

  for (const slug of oldSlugs) {
    if (newSlugs.has(slug)) continue;
    const filePath = path.join(CONTENT_DIR, `${slug}.md`);
    try {
      await fs.unlink(filePath);
      console.log(`  - content/${slug}.md (no longer published)`);
    } catch {
      // Already gone — fine.
    }
  }

  await writeManifest(newSlugs);
  console.log(`Done. Manifest: ${newSlugs.size} slugs.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
