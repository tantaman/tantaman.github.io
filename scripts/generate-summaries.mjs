#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const CONTENT_DIR = new URL('../content/', import.meta.url).pathname;
const COLLECTIONS = ['', 'bookmarks/', 'notes/', 'the-mirror-room/', 'chats/'];
const SKIP_FILES = new Set([
  'index.js',
  'index.md',
  'README.md',
  '404.md',
  'tags.js',
  'audio.md',
  'scratch.md',
]);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

if (dryRun) console.log('DRY RUN - no files will be modified\n');

const client = new Anthropic();

async function getContentFiles() {
  const files = [];

  for (const collection of COLLECTIONS) {
    const dir = join(CONTENT_DIR, collection);
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const ext = extname(entry);
      if (ext !== '.md' && ext !== '.mdx') continue;
      if (SKIP_FILES.has(entry)) continue;

      files.push({
        path: join(dir, entry),
        collection,
        filename: entry,
      });
    }
  }

  return files;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;

  const raw = match[1];
  const endIndex = match[0].length;

  // Simple YAML key extraction - check for summary field
  const lines = raw.split('\n');
  const fields = {};
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      fields[kv[1]] = kv[2];
    }
  }

  return {
    raw,
    body: content.slice(endIndex),
    fields,
    fullMatch: match[0],
  };
}

function hasSummary(fm) {
  return fm.fields.summary !== undefined;
}

function isDraft(fm) {
  return fm.fields.draft === 'true' || fm.fields.draft === true;
}

async function generateSummary(title, body) {
  const truncatedBody = body.slice(0, 8000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a 2-3 sentence summary of this blog post. Be concise and informative. Focus on what the post argues or explores. Do not start with "This post" or "The author". Just state the ideas directly.

Title: ${title}

${truncatedBody}`,
      },
    ],
  });

  return response.content[0].text.trim();
}

function insertSummary(content, fm, summary) {
  // Escape single quotes in summary for YAML
  const escaped = summary.replace(/'/g, "''");
  const summaryLine = `summary: '${escaped}'`;

  // Insert summary as the last field before the closing ---
  const newFrontmatter = `---\n${fm.raw}\n${summaryLine}\n---\n`;
  return newFrontmatter + fm.body;
}

async function main() {
  const files = await getContentFiles();
  console.log(`Found ${files.length} content files\n`);

  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const content = await readFile(file.path, 'utf-8');
    const fm = parseFrontmatter(content);

    if (!fm) {
      console.log(`  SKIP (no frontmatter): ${file.collection}${file.filename}`);
      skipped++;
      continue;
    }

    if (isDraft(fm)) {
      console.log(`  SKIP (draft): ${file.collection}${file.filename}`);
      skipped++;
      continue;
    }

    if (hasSummary(fm) && !force) {
      console.log(`  SKIP (has summary): ${file.collection}${file.filename}`);
      skipped++;
      continue;
    }

    const title = fm.fields.title
      ? fm.fields.title.replace(/^['"]|['"]$/g, '')
      : file.filename;

    if (dryRun) {
      console.log(`  WOULD SUMMARIZE: ${file.collection}${file.filename} - "${title}"`);
      processed++;
      continue;
    }

    console.log(`  Summarizing: ${file.collection}${file.filename} - "${title}"`);

    try {
      const summary = await generateSummary(title, fm.body);
      const updated = insertSummary(content, fm, summary);
      await writeFile(file.path, updated, 'utf-8');
      console.log(`    ✓ ${summary.slice(0, 80)}...`);
      processed++;

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
    }
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
