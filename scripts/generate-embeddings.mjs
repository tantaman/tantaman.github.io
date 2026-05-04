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

const CACHE_FILE = new URL('../.chat-embeddings-cache.json', import.meta.url).pathname;

const CHUNK_SIZE = 2000; // ~500 tokens
const CHUNK_OVERLAP = 400; // ~100 tokens
const EMBED_BATCH_SIZE = 100;
const UPSERT_BATCH_SIZE = 100;
const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';
const VECTORIZE_INDEX = 'thought-embeddings';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) console.log('DRY RUN - no API calls or cache writes\n');

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

function blogChunkVectorId(fileKey, chunk) {
  // Vectorize IDs only allow [A-Za-z0-9_-]; mirror the worker's helper.
  const safe = fileKey.replace(/[^A-Za-z0-9_-]/g, '_');
  return `blog-${safe}-${chunk}`;
}

async function loadCache() {
  try {
    const data = await readFile(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Migrate legacy `{ [fileKey]: hash }` shape to `{ [fileKey]: { hash, chunkCount } }`.
    // Legacy entries lack chunkCount, so we treat them as unknown and force a re-embed.
    const migrated = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string') {
        migrated[key] = { hash: val, chunkCount: -1 };
      } else {
        migrated[key] = val;
      }
    }
    return migrated;
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

async function vectorizeUpsert(vectors) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX}/upsert`;
  const ndjson = vectors.map((v) => JSON.stringify(v)).join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/x-ndjson',
    },
    body: ndjson,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vectorize upsert failed ${response.status}: ${body}`);
  }
  const result = await response.json();
  if (!result.success) {
    throw new Error(`Vectorize upsert failed: ${JSON.stringify(result.errors)}`);
  }
}

async function vectorizeDeleteIds(ids) {
  if (ids.length === 0) return;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX}/delete-by-ids`;
  // Vectorize deletes up to 1000 IDs per request; chunk for safety.
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: batch }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Vectorize delete failed ${response.status}: ${body}`);
    }
  }
}

function postUrl(collection, filename) {
  const base = basename(filename, extname(filename));
  return `https://tantaman.com/${collection}${base}.html`;
}

async function main() {
  const files = await getContentFiles();
  console.log(`Found ${files.length} content files\n`);

  const cache = await loadCache();
  const newCache = {};

  // Plan changes: figure out which posts need (re)embedding and which chunks
  // are stale (old chunks that exceed the new chunk count, or chunks belonging
  // to deleted/renamed posts).
  const toEmbed = []; // [{ fileKey, title, url, chunks }]
  const idsToDelete = [];
  let unchanged = 0;
  let changed = 0;

  const liveFileKeys = new Set();

  for (const file of files) {
    const content = await readFile(file.path, 'utf-8');
    const { fields, body } = parseFrontmatter(content);

    if (fields.draft === 'true' || fields.draft === true) {
      console.log(`  SKIP (draft): ${file.collection}${file.filename}`);
      continue;
    }

    const hash = contentHash(content);
    const fileKey = `${file.collection}${file.filename}`;
    liveFileKeys.add(fileKey);
    const title = fields.title || file.filename.replace(/\.(md|mdx)$/, '');
    const url = postUrl(file.collection, file.filename);

    const cleanBody = cleanTextForEmbedding(body);
    const chunks = chunkText(cleanBody);

    const prev = cache[fileKey];
    if (prev && prev.hash === hash && prev.chunkCount === chunks.length) {
      unchanged++;
      newCache[fileKey] = { hash, chunkCount: chunks.length };
      continue;
    }

    changed++;

    // If chunk count shrank, delete the now-orphaned chunks.
    if (prev && prev.chunkCount > chunks.length) {
      for (let i = chunks.length; i < prev.chunkCount; i++) {
        idsToDelete.push(blogChunkVectorId(fileKey, i));
      }
    }

    toEmbed.push({ fileKey, title, url, chunks, hash });
  }

  // Posts present in cache but missing from disk → delete all their chunks.
  for (const [fileKey, entry] of Object.entries(cache)) {
    if (liveFileKeys.has(fileKey)) continue;
    const count = entry.chunkCount > 0 ? entry.chunkCount : 0;
    for (let i = 0; i < count; i++) {
      idsToDelete.push(blogChunkVectorId(fileKey, i));
    }
  }

  const totalNewChunks = toEmbed.reduce((sum, p) => sum + p.chunks.length, 0);

  console.log(`Unchanged posts: ${unchanged}`);
  console.log(`Changed/new posts: ${changed}`);
  console.log(`Chunks needing embeddings: ${totalNewChunks}`);
  console.log(`Vector IDs to delete: ${idsToDelete.length}`);

  if (dryRun) {
    console.log('\nDry run complete.');
    return;
  }

  // Delete stale chunks first so we never leave orphans pointing at old text.
  if (idsToDelete.length > 0) {
    console.log(`\nDeleting ${idsToDelete.length} stale vectors...`);
    await vectorizeDeleteIds(idsToDelete);
  }

  if (totalNewChunks === 0) {
    await saveCache({ ...cache, ...newCache });
    // Drop cache entries for deleted posts.
    const finalCache = {};
    for (const [k, v] of Object.entries({ ...cache, ...newCache })) {
      if (liveFileKeys.has(k)) finalCache[k] = v;
    }
    await saveCache(finalCache);
    console.log('\nNothing to embed. Cache updated.');
    return;
  }

  // Build a flat list of chunks to embed, tagged with their owning post.
  const flatChunks = [];
  for (const post of toEmbed) {
    for (let i = 0; i < post.chunks.length; i++) {
      flatChunks.push({
        post,
        chunkIndex: i,
        text: post.chunks[i],
      });
    }
  }

  console.log(
    `\nEmbedding ${flatChunks.length} chunks in batches of ${EMBED_BATCH_SIZE}...`
  );

  // We accumulate vectors per post so we can write a cache entry only after
  // every chunk for that post has been successfully upserted.
  const postProgress = new Map(); // fileKey -> { embedded: Set<chunkIndex>, post }
  for (const post of toEmbed) {
    postProgress.set(post.fileKey, { embedded: new Set(), post });
  }
  const pendingVectors = []; // vectors waiting to be upserted

  async function flushUpserts(force) {
    while (pendingVectors.length >= UPSERT_BATCH_SIZE || (force && pendingVectors.length > 0)) {
      const batch = pendingVectors.splice(0, UPSERT_BATCH_SIZE);
      await vectorizeUpsert(batch);
    }
  }

  for (let i = 0; i < flatChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = flatChunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(flatChunks.length / EMBED_BATCH_SIZE);
    console.log(`  Embed batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    const embeddings = await embedBatch(texts);

    for (let j = 0; j < batch.length; j++) {
      const c = batch[j];
      pendingVectors.push({
        id: blogChunkVectorId(c.post.fileKey, c.chunkIndex),
        values: embeddings[j],
        metadata: {
          kind: 'blog',
          postTitle: c.post.title,
          postUrl: c.post.url,
          chunkIndex: c.chunkIndex,
          text: c.text,
        },
      });
      const progress = postProgress.get(c.post.fileKey);
      progress.embedded.add(c.chunkIndex);
    }

    await flushUpserts(false);

    // After each embed batch, persist cache for any post that's now fully done.
    let cacheDirty = false;
    for (const [fileKey, { embedded, post }] of postProgress) {
      if (embedded.size === post.chunks.length && !newCache[fileKey]) {
        newCache[fileKey] = { hash: post.hash, chunkCount: post.chunks.length };
        cacheDirty = true;
      }
    }
    if (cacheDirty) {
      const merged = { ...cache, ...newCache };
      const finalCache = {};
      for (const [k, v] of Object.entries(merged)) {
        if (liveFileKeys.has(k)) finalCache[k] = v;
      }
      await saveCache(finalCache);
    }

    if (i + EMBED_BATCH_SIZE < flatChunks.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  await flushUpserts(true);

  // Final cache write.
  const merged = { ...cache, ...newCache };
  const finalCache = {};
  for (const [k, v] of Object.entries(merged)) {
    if (liveFileKeys.has(k)) finalCache[k] = v;
  }
  await saveCache(finalCache);

  console.log(`\nDone. Upserted ${flatChunks.length} blog chunks to Vectorize.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
