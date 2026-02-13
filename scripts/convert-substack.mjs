import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import TurndownService from 'turndown';

const ROOT = path.resolve(import.meta.dirname, '..');
const SUBSTACK_DIR = path.join(ROOT, 'content', 'substack');
const IMAGE_DIR = path.join(ROOT, 'docs', 'blog-assets', 'substack');
const SUBSTACK_API = 'https://tantaman.substack.com/api/v1/posts';

// ── Fetch post dates from Substack API ──────────────────────────────────────

async function fetchPostDates() {
  const dateMap = {};
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUBSTACK_API}?offset=${offset}&limit=50`);
    const posts = await res.json();
    if (!posts.length) break;
    for (const p of posts) {
      dateMap[p.id] = p.post_date;
    }
    offset += posts.length;
    if (posts.length < 50) break;
  }
  return dateMap;
}

// ── Image downloading ───────────────────────────────────────────────────────

async function downloadImage(url, filename) {
  const dest = path.join(IMAGE_DIR, filename);
  if (existsSync(dest)) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
  } catch (err) {
    console.warn(`  WARN: failed to download image ${url}: ${err.message}`);
    return false;
  }
  return true;
}

// ── Title case helper ───────────────────────────────────────────────────────

function titleCase(str) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

// ── Turndown setup ──────────────────────────────────────────────────────────

function createTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  // Handle <ol start="N"> by preserving the start number
  td.addRule('orderedListStart', {
    filter: (node) => node.nodeName === 'OL' && node.getAttribute('start'),
    replacement(content, node) {
      const start = parseInt(node.getAttribute('start'), 10);
      // Re-number the list items in the already-converted content
      let idx = start;
      const renumbered = content.replace(/^\d+\./gm, () => `${idx++}.`);
      return '\n\n' + renumbered.trim() + '\n\n';
    },
  });

  return td;
}

// ── Process a single file ───────────────────────────────────────────────────

async function processFile(filename, dateMap) {
  const match = filename.match(/^(\d+)\.(.+)\.html$/);
  if (!match) return;
  const [, postId, slug] = match;

  // Read HTML
  const html = await readFile(path.join(SUBSTACK_DIR, filename), 'utf-8');

  // Skip empty posts
  const stripped = html.replace(/<\/?p>/g, '').trim();
  if (!stripped) {
    console.log(`  SKIP (empty): ${filename}`);
    return;
  }

  // Derive date from API data
  const postDate = dateMap[postId];
  let dateStr;
  if (postDate) {
    const d = new Date(postDate);
    dateStr = d.toISOString().slice(0, 10);
  } else {
    console.warn(`  WARN: no date found for post ${postId} (${slug}), using 2025-01-01`);
    dateStr = '2025-01-01';
  }

  const $ = load(html);

  // Remove subscription widgets
  $('div.subscription-widget-wrap-editor').remove();

  // Remove digest post embeds (cross-post link cards)
  $('div.digest-post-embed').remove();

  // Process captioned-image-container: download images and simplify
  const imageContainers = $('div.captioned-image-container');
  for (const container of imageContainers) {
    const $container = $(container);
    const $img = $container.find('img');
    if ($img.length === 0) {
      $container.remove();
      continue;
    }

    // Try to get clean S3 URL from data-attrs
    let imgUrl;
    const dataAttrs = $img.attr('data-attrs');
    if (dataAttrs) {
      try {
        const attrs = JSON.parse(dataAttrs);
        if (attrs.src) imgUrl = attrs.src;
      } catch {}
    }
    // Fall back to src attribute
    if (!imgUrl) imgUrl = $img.attr('src');
    if (!imgUrl) {
      $container.remove();
      continue;
    }

    // Extract filename from URL
    const urlPath = new URL(imgUrl).pathname;
    const imageFilename = path.basename(urlPath);

    // Download image
    const ok = await downloadImage(imgUrl, imageFilename);
    const localPath = ok !== false
      ? `/blog-assets/substack/${imageFilename}`
      : imgUrl; // keep original URL as fallback

    // Get alt text
    const alt = $img.attr('alt') || '';

    // Replace entire container with simple <img>
    $container.replaceWith(`<img src="${localPath}" alt="${alt}">`);
  }

  // Remove trailing <hr> sequences at end of content
  // Remove <div><hr></div> wrappers and bare <hr> at the end
  const body = $.root();
  let lastChild = body.children().last();
  while (lastChild.length) {
    const tagName = lastChild.prop('tagName');
    if (tagName === 'HR') {
      lastChild.remove();
      lastChild = body.children().last();
    } else if (tagName === 'DIV' && lastChild.children().length === 1 && lastChild.children().first().prop('tagName') === 'HR') {
      lastChild.remove();
      lastChild = body.children().last();
    } else {
      break;
    }
  }

  // Extract title: first <h1>, or derive from slug
  let title;
  const $h1 = $('h1').first();
  if ($h1.length) {
    title = $h1.text().trim();
    $h1.remove();
  } else {
    title = titleCase(slug.replace(/-/g, ' '));
  }

  // Escape single quotes in title for YAML
  const yamlTitle = title.replace(/'/g, "''");

  // Convert to markdown
  const td = createTurndown();
  const markdown = td.turndown($.html());

  // Clean up excessive blank lines
  const cleanedMarkdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  // Write output
  const outFilename = `${dateStr}-${slug}.md`;
  const outPath = path.join(SUBSTACK_DIR, outFilename);
  const content = `---
title: '${yamlTitle}'
tags: [substack]
---

${cleanedMarkdown}
`;

  await writeFile(outPath, content, 'utf-8');
  console.log(`  OK: ${filename} → ${outFilename}`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching post dates from Substack API...');
  const dateMap = await fetchPostDates();
  console.log(`Got dates for ${Object.keys(dateMap).length} posts\n`);

  await mkdir(IMAGE_DIR, { recursive: true });

  const files = (await readdir(SUBSTACK_DIR)).filter((f) => f.endsWith('.html'));
  console.log(`Processing ${files.length} HTML files...\n`);

  for (const file of files.sort()) {
    await processFile(file, dateMap);
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
