#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import 'dotenv/config';

const CONTENT_DIR = new URL('../content/', import.meta.url).pathname;
const CACHE_FILE = new URL('../.carousel-cache.json', import.meta.url).pathname;
const COLLECTIONS = ['', 'the-mirror-room/', 'chats/'];
const SKIP_FILES = new Set([
  'index.js',
  'index.md',
  'README.md',
  '404.md',
  'tags.js',
  'memes.js',
  'blog.js',
  'audio.md',
  'scratch.md',
]);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

if (dryRun) console.log('DRY RUN - no files will be modified\n');

const client = new Anthropic();

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;

  const raw = match[1];
  const endIndex = match[0].length;

  const lines = raw.split('\n');
  const fields = {};
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      fields[kv[1]] = kv[2];
    }
  }

  return {
    body: content.slice(endIndex),
    fields,
  };
}

function extractDate(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  return basename.substring(0, 10);
}

async function loadCache() {
  try {
    const data = await readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function getEligiblePosts() {
  const posts = [];

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

      const content = await readFile(join(dir, entry), 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) continue;
      if (fm.fields.draft === 'true' || fm.fields.draft === true) continue;

      const date = fm.fields.date
        ? String(fm.fields.date).substring(0, 10)
        : extractDate(entry);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

      const title = fm.fields.title
        ? fm.fields.title.replace(/^['"]|['"]$/g, '')
        : entry;

      posts.push({
        collection,
        filename: entry,
        title,
        body: fm.body,
        date,
      });
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

async function generateCarouselPoints(title, body) {
  const truncatedBody = body.slice(0, 8000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Extract 5-8 of the most intriguing, standalone key points from this essay. Each point should make a reader desperate to understand the full argument. Think Instagram carousel — each line appears on its own slide.

Rules:
- 8 to 20 words per point
- No numbering, no bullets, no quotes
- Each line must provoke curiosity, not summarize
- First line should be the most provocative hook
- Last line should feel like an unresolved cliffhanger
- One point per line

Title: ${title}

${truncatedBody}`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function main() {
  const posts = await getEligiblePosts();
  const cache = await loadCache();

  console.log(`Found ${posts.length} eligible posts\n`);

  let generated = 0;
  let skipped = 0;

  for (const post of posts) {
    const label = `${post.collection}${post.filename}`;

    if (cache[post.title] && !force) {
      console.log(`  CACHED: ${label} - "${post.title}" (${cache[post.title].length} points)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  WOULD GENERATE: ${label} - "${post.title}"`);
      generated++;
      continue;
    }

    console.log(`  Generating: ${label} - "${post.title}"`);

    try {
      const points = await generateCarouselPoints(post.title, post.body);
      cache[post.title] = points;
      await saveCache(cache);
      console.log(`    -> ${points.length} points:`);
      for (const p of points) {
        console.log(`       ${p}`);
      }
      generated++;

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }
  }

  console.log(
    `\nDone. ${dryRun ? 'Would generate' : 'Generated'}: ${generated}, Cached: ${skipped}`,
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
