#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';

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

const OUTPUT_FILE = new URL('../.chat-embeddings.json', import.meta.url).pathname;
const CACHE_FILE = new URL('../.chat-embeddings-cache.json', import.meta.url).pathname;

const CHUNK_SIZE = 2000; // ~500 tokens
const CHUNK_OVERLAP = 400; // ~100 tokens
const EMBED_BATCH_SIZE = 100;
const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) console.log('DRY RUN - no files will be written\n');

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!dryRun && (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)) {
  console.error('Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars required');
  process.exit(1);
}

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
      if (entry.startsWith('.')) continue;

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
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
  if (!match) return { fields: {}, body: content };

  const raw = match[1];
  const body = match[2];

  const lines = raw.split('\n');
  const fields = {};
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) {
      fields[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
    }
  }

  return { fields, body };
}

function cleanTextForEmbedding(text) {
  let cleaned = text;
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`[^`]+`/g, '');
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  cleaned = cleaned.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => display || target);
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned.replace(/^---[\s\S]*?---/m, '');
  cleaned = cleaned.replace(/[#*_~>]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function chunkText(text) {
  if (text.length <= CHUNK_SIZE) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    if (end < text.length) {
      // Try to break at sentence boundary
      const segment = text.slice(start, end);
      const lastPeriod = segment.lastIndexOf('. ');
      const lastQuestion = segment.lastIndexOf('? ');
      const lastExclaim = segment.lastIndexOf('! ');
      const lastNewline = segment.lastIndexOf('\n');

      const breakPoint = Math.max(lastPeriod, lastQuestion, lastExclaim, lastNewline);

      if (breakPoint > CHUNK_SIZE * 0.3) {
        end = start + breakPoint + 1;
      }
    } else {
      end = text.length;
    }

    chunks.push(text.slice(start, end).trim());

    // Move forward with overlap
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    // Prevent infinite loop if overlap pushes us back
    if (start <= chunks.length > 1 ? end - CHUNK_SIZE : -1) {
      start = end;
    }
  }

  return chunks.filter(c => c.length > 50);
}

function contentHash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
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
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

async function embedBatch(texts) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${EMBED_MODEL}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare AI API error ${response.status}: ${body}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(`Cloudflare AI API failed: ${JSON.stringify(result.errors)}`);
  }

  return result.result.data;
}

function postUrl(collection, filename) {
  const base = basename(filename, extname(filename));
  return `https://tantaman.com/${collection}${base}.html`;
}

async function main() {
  const files = await getContentFiles();
  console.log(`Found ${files.length} content files\n`);

  const cache = await loadCache();

  // Load existing embeddings output if it exists (for reusing cached chunks)
  let existingChunks = new Map();
  try {
    const existing = JSON.parse(await readFile(OUTPUT_FILE, 'utf-8'));
    for (const chunk of existing) {
      existingChunks.set(chunk.id, chunk);
    }
  } catch {
    // No existing file
  }

  const allChunks = [];
  const newCache = {};
  let changedPosts = 0;
  let unchangedPosts = 0;

  for (const file of files) {
    const content = await readFile(file.path, 'utf-8');
    const { fields, body } = parseFrontmatter(content);

    if (fields.draft === 'true' || fields.draft === true) {
      console.log(`  SKIP (draft): ${file.collection}${file.filename}`);
      continue;
    }

    const hash = contentHash(content);
    const fileKey = `${file.collection}${file.filename}`;
    const title = fields.title || file.filename.replace(/\.(md|mdx)$/, '');
    const url = postUrl(file.collection, file.filename);

    const cleanBody = cleanTextForEmbedding(body);
    const chunks = chunkText(cleanBody);

    if (cache[fileKey] === hash) {
      // Content unchanged - reuse existing chunks
      let reused = true;
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${fileKey}#${i}`;
        if (existingChunks.has(chunkId)) {
          allChunks.push(existingChunks.get(chunkId));
        } else {
          reused = false;
          break;
        }
      }
      if (reused) {
        newCache[fileKey] = hash;
        unchangedPosts++;
        continue;
      }
    }

    changedPosts++;

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        id: `${fileKey}#${i}`,
        postTitle: title,
        postUrl: url,
        chunkIndex: i,
        text: chunks[i],
        embedding: null, // Will be filled in
      });
    }

    newCache[fileKey] = hash;
  }

  // Identify chunks that need embeddings
  const chunksNeedingEmbeddings = allChunks.filter(c => c.embedding === null);

  console.log(`\nTotal chunks: ${allChunks.length}`);
  console.log(`Unchanged posts (cached): ${unchangedPosts}`);
  console.log(`Changed/new posts: ${changedPosts}`);
  console.log(`Chunks needing embeddings: ${chunksNeedingEmbeddings.length}`);

  if (dryRun) {
    console.log('\nDry run complete.');
    return;
  }

  if (chunksNeedingEmbeddings.length === 0) {
    console.log('\nAll embeddings cached. Writing output...');
    await writeFile(OUTPUT_FILE, JSON.stringify(allChunks), 'utf-8');
    await saveCache(newCache);
    console.log(`Written ${allChunks.length} chunks to ${OUTPUT_FILE}`);
    return;
  }

  // Embed in batches
  console.log(`\nEmbedding ${chunksNeedingEmbeddings.length} chunks in batches of ${EMBED_BATCH_SIZE}...`);

  for (let i = 0; i < chunksNeedingEmbeddings.length; i += EMBED_BATCH_SIZE) {
    const batch = chunksNeedingEmbeddings.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map(c => c.text);

    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunksNeedingEmbeddings.length / EMBED_BATCH_SIZE);
    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    const embeddings = await embedBatch(texts);

    for (let j = 0; j < batch.length; j++) {
      batch[j].embedding = embeddings[j];
    }

    // Small delay between batches to be nice
    if (i + EMBED_BATCH_SIZE < chunksNeedingEmbeddings.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Write output
  await writeFile(OUTPUT_FILE, JSON.stringify(allChunks), 'utf-8');
  await saveCache(newCache);

  console.log(`\nDone. Written ${allChunks.length} chunks to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
