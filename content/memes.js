import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
  renderMemeCard,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_FILE = '.meme-cache.json';
const CONTENT_DIR = './content/';

export default async function memes(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse, { fragment: true })
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

      const date = fm.date
        ? String(fm.date).substring(0, 10)
        : extractDate(postMeta.compiledFilename);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

      allPosts.push({ collection, key, meta: postMeta, date });
    });
  });

  // Sort by date descending
  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  // Load cache — only render posts that already have a cached thesis
  const cache = await loadCache();

  const cards = (
    await Promise.all(
      allPosts.map(async ({ collection, key, meta: postMeta }) => {
        const fm = postMeta.frontmatter || {};
        const title = fm.title || key;

        // Skip posts without a pre-generated thesis (run `pnpm theses` first)
        if (!cache[title]) return null;

        const url = postMeta.compiledFilename;
        const thesis = cache[title];

        // Read markdown body for hero image extraction
        const filePath = join(CONTENT_DIR, collection, key);
        const content = await readFile(filePath, 'utf-8');
        const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');

        const image = fm.image || extractFirstImage(body);
        const sentimentColor = postMeta.sentimentColor;

        return renderMemeCard({ url, title, thesis, image, sentimentColor });
      }),
    )
  ).filter(Boolean);

  return `
<div class="memes-page">
  ${cards.join('\n')}
</div>`;
}

function extractFirstImage(markdownBody) {
  const match = markdownBody.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractDate(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  return basename.substring(0, 10);
}
