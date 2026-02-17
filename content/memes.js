import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import 'dotenv/config';

const CACHE_FILE = '.meme-cache.json';
const CONTENT_DIR = './content/';
const TOP_N = 5;

export default async function memes(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/memes.css']),
          title: 'Memes',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Memes - Tantamanlands',
          description: 'The latest essays distilled into meme cards',
        })
        .use(() => (tree, file) => { file.data.matter = { noHeader: true }; })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await memesPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Memes',
      description: 'The latest essays distilled into meme cards',
      noHeader: true,
    },
    greymatter: {},
  };
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

async function getThesis(title, body, cache) {
  if (cache[title]) return cache[title];

  const client = new Anthropic();
  const truncatedBody = body.slice(0, 8000);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Distill this essay into a single provocative sentence — the kind of line that makes someone stop scrolling. No more than 15 words. Think meme caption, not academic abstract. Return ONLY the sentence, no quotes, no punctuation at the end unless it's a question mark.

Title: ${title}

${truncatedBody}`,
      },
    ],
  });

  const thesis = response.content[0].text.trim();
  cache[title] = thesis;
  return thesis;
}

async function memesPage() {
  const indices = await indexFrontmatter();

  // Collect all posts from relevant sections
  const allPosts = [];
  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/') return;

    Object.entries(index).forEach(([key, postMeta]) => {
      if (key === 'index.js' || key === 'README.md' || key === '404.md') return;
      if (key === 'tags.js' || key === 'memes.js' || key === 'blog.js') return;
      if (key === 'index.md' || key === 'audio.md' || key === 'scratch.md') return;

      const fm = postMeta.frontmatter || {};
      if (fm.draft) return;

      allPosts.push({ collection, key, meta: postMeta });
    });
  });

  // Sort by date descending, take top 5
  allPosts.sort((a, b) => {
    const dateA = a.meta.frontmatter?.date || extractDate(a.meta.compiledFilename);
    const dateB = b.meta.frontmatter?.date || extractDate(b.meta.compiledFilename);
    return dateB.localeCompare(dateA);
  });

  const top = allPosts.slice(0, TOP_N);

  // Load cache and generate thesis lines
  const cache = await loadCache();

  const cards = await Promise.all(
    top.map(async ({ collection, key, meta: postMeta }) => {
      const fm = postMeta.frontmatter || {};
      const title = fm.title || key;
      const image = fm.image;
      const url = postMeta.compiledFilename;

      // Read full markdown content for thesis generation
      const filePath = join(CONTENT_DIR, collection, key);
      const content = await readFile(filePath, 'utf-8');
      const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');

      const thesis = await getThesis(title, body, cache);

      const imgTag = image
        ? `<img src="${image}" alt="" class="meme-bg" />`
        : '';
      const noImageClass = image ? '' : ' no-image';

      return `
    <a class="meme-card${noImageClass}" href="${url}">
      ${imgTag}
      <div class="meme-overlay">
        <p class="meme-thesis">${thesis}</p>
        <span class="meme-title">${escapeHtml(title)} &rarr;</span>
      </div>
    </a>`;
    }),
  );

  await saveCache(cache);

  return `
<div class="memes-page">
  ${cards.join('\n')}
</div>`;
}

function extractDate(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  return basename.substring(0, 10);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
