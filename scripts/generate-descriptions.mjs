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

  // Simple YAML key extraction - check for description field
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

function hasDescription(fm) {
  return fm.fields.description !== undefined;
}

function isDraft(fm) {
  return fm.fields.draft === 'true' || fm.fields.draft === true;
}

async function generateDescription(title, body) {
  const truncatedBody = body.slice(0, 8000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Write a 2-3 sentence description of this blog post. Be concise and informative. Focus on what the post argues or explores. Do not start with "This post" or "The author". Just state the ideas directly. Return ONLY the plain text description — no markdown, no headers, no bullet points, no formatting. Everything on a single line.

Title: ${title}

${truncatedBody}`,
      },
    ],
  });

  // Collapse to a single line and strip any markdown formatting
  return response.content[0].text
    .replace(/\n+/g, ' ')
    .replace(/^#+\s*/g, '')
    .replace(/\*+/g, '')
    .trim();
}

function insertDescription(content, fm, description) {
  // Escape single quotes in description for YAML
  const escaped = description.replace(/'/g, "''");
  const descriptionLine = `description: '${escaped}'`;

  // Insert description as the last field before the closing ---
  const newFrontmatter = `---\n${fm.raw}\n${descriptionLine}\n---\n`;
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

    if (hasDescription(fm) && !force) {
      console.log(`  SKIP (has description): ${file.collection}${file.filename}`);
      skipped++;
      continue;
    }

    const title = fm.fields.title
      ? fm.fields.title.replace(/^['"]|['"]$/g, '')
      : file.filename;

    if (dryRun) {
      console.log(`  WOULD GENERATE: ${file.collection}${file.filename} - "${title}"`);
      processed++;
      continue;
    }

    console.log(`  Generating: ${file.collection}${file.filename} - "${title}"`);

    try {
      const description = await generateDescription(title, fm.body);
      const updated = insertDescription(content, fm, description);
      await writeFile(file.path, updated, 'utf-8');
      console.log(`    ✓ ${description.slice(0, 80)}...`);
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
