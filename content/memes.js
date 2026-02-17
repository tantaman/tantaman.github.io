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
import { readFile, mkdir, access } from 'node:fs/promises';
import { join, basename, extname, dirname } from 'node:path';
import sharp from 'sharp';

const CACHE_FILE = '.meme-cache.json';
const CONTENT_DIR = './content/';
const THUMB_DIR = './docs/meme-thumbs';
const THUMB_URL_PREFIX = '/meme-thumbs';
const THUMB_WIDTH = 960;

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

async function generateThumbnail(imagePath) {
  if (!imagePath) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  if (extname(imagePath).toLowerCase() === '.svg') return imagePath;

  // Resolve local path to file on disk
  const source = imagePath.startsWith('/')
    ? join('docs', imagePath)
    : join('docs', imagePath);

  const dir = basename(dirname(source));
  const name = basename(source, extname(source));
  const thumbName = `${dir}-${name}.webp`;
  const thumbPath = join(THUMB_DIR, thumbName);
  const thumbUrl = `${THUMB_URL_PREFIX}/${thumbName}`;

  try {
    await access(thumbPath);
    return thumbUrl;
  } catch {
    // Thumbnail doesn't exist yet — generate it
  }

  try {
    await sharp(source)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(thumbPath);
    return thumbUrl;
  } catch (err) {
    console.warn(`[memes] Failed to generate thumbnail for ${imagePath}:`, err.message);
    return imagePath;
  }
}

async function memesPage() {
  await mkdir(THUMB_DIR, { recursive: true });
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

        const rawImage = fm.image || extractFirstImage(body);
        const image = await generateThumbnail(rawImage);
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
