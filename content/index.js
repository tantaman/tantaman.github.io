import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
  renderMemeCard,
  generateThumbnail,
  tagId,
  readingTime,
  inferForm,
  renderPills,
  stripTags,
  truncate,
  contentDirs,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import { readFile } from 'node:fs/promises';

const THUMB_DIR = './docs/meme-thumbs';
const THUMB_URL_PREFIX = '/meme-thumbs';
const THUMB_WIDTH = 960;
const PAGE_SIZE = 20;

export default async function index(file, cwd, files) {
  const artifact = {
    content: async () => {
      const { html, companionFiles } = await buildPages();
      artifact.companionFiles = companionFiles;

      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/home.css', '/memes.css']),
          js: doc.js.concat(['/home.js']),
        })
        .use(rehypeMeta, meta)
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(html);

      return result.toString();
    },
    companionFiles: [],
    frontmatter: {},
    greymatter: {},
    dependencies: [...contentDirs(), '.meme-cache.json'],
  };
  return artifact;
}

async function loadCache() {
  try {
    const data = await readFile('.meme-cache.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function buildPages() {
  const indices = await indexFrontmatter();
  const cache = await loadCache();

  // Collect all posts from relevant sections
  const allPosts = [];

  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/' || collection === 'pages/') return;

    Object.entries(index)
      .filter(
        ([key, _]) =>
          key !== 'index.js' && key !== 'README.md' && key !== '404.md',
      )
      .forEach(([key, meta]) => {
        allPosts.push({
          collection,
          key,
          meta,
        });
      });
  });

  const sortedPosts = allPosts.sort((a, b) => {
    const dateA =
      a.meta.frontmatter?.date || extractDate(a.meta.compiledFilename);
    const dateB =
      b.meta.frontmatter?.date || extractDate(b.meta.compiledFilename);
    return dateB.localeCompare(dateA);
  });

  const pinned = sortedPosts.filter(p => p.key === 'start-here.md');
  const unpinned = sortedPosts.filter(p => p.key !== 'start-here.md');

  const featured = unpinned.slice(0, 3);
  const remaining = [...pinned, ...unpinned.slice(3)];

  const featuredCards = await Promise.all(
    featured.map(async ({ collection, meta: postMeta }) => {
      const title = postMeta.frontmatter?.title || '';
      const thesis = cache[title];
      const rawImage = postMeta.frontmatter?.image || postMeta.firstImage;
      const image = await generateThumbnail(rawImage, THUMB_DIR, THUMB_URL_PREFIX, THUMB_WIDTH);

      if (thesis) {
        return renderMemeCard({
          url: postMeta.compiledFilename,
          title,
          thesis,
          image,
          sentimentColor: postMeta.sentimentColor,
        });
      }
      return renderCard(collection, postMeta, image);
    }),
  );

  // Split remaining posts into pages
  const page1Remaining = remaining.slice(0, PAGE_SIZE);
  const overflow = remaining.slice(PAGE_SIZE);
  const totalPages = 1 + Math.ceil(overflow.length / PAGE_SIZE);

  const page1Cards = await Promise.all(
    page1Remaining.map(async ({ collection, meta: postMeta }) => {
      const rawImage = postMeta.frontmatter?.image || postMeta.firstImage;
      const image = await generateThumbnail(rawImage, THUMB_DIR, THUMB_URL_PREFIX, THUMB_WIDTH);
      return renderCard(collection, postMeta, image);
    }),
  );

  // Generate companion fragment files for pages 2+
  const companionFiles = [];
  for (let p = 2; p <= totalPages; p++) {
    const start = (p - 2) * PAGE_SIZE;
    const pageSlice = overflow.slice(start, start + PAGE_SIZE);
    const cards = await Promise.all(
      pageSlice.map(async ({ collection, meta: postMeta }) => {
        const rawImage = postMeta.frontmatter?.image || postMeta.firstImage;
        const image = await generateThumbnail(rawImage, THUMB_DIR, THUMB_URL_PREFIX, THUMB_WIDTH);
        return renderCard(collection, postMeta, image);
      }),
    );
    companionFiles.push({
      name: `page-${p}.html`,
      content: cards.join('\n'),
    });
  }

  const sentinel = totalPages > 1
    ? `<div id="page-sentinel" data-next-page="2" data-total-pages="${totalPages}"></div>`
    : '';

  const html = `
<div class="home wide">
  <div class="masonry">
    ${featuredCards.join('\n')}
  </div>
  ${
    page1Cards.length > 0
      ? `
  <div class="more-grid">
    ${page1Cards.join('\n')}
  </div>`
      : ''
  }
  ${sentinel}
</div>`;

  return { html, companionFiles };
}


const CONCERN_ICON = {
  self: '👁',
  power: '⚡',
  craft: '🔧',
  ground: '⚓',
  knowledge: '💡',
  modernity: '⚙️',
  systems: '🔗',
};

function renderCard(collection, meta, resolvedImage) {
  const collectionLabel = getCollectionName(collection);
  const date = meta.frontmatter?.date || extractDate(meta.compiledFilename);
  const image = resolvedImage !== undefined ? resolvedImage : meta.frontmatter?.image;
  const concernIcons = (meta.frontmatter?.concern || [])
    .map((c) => CONCERN_ICON[c])
    .filter(Boolean)
    .join(' ');
  const mins = readingTime(meta.wordCount);

  return `
    <a class="card" href="${meta.compiledFilename}">
      ${meta.sentimentColor ? `<div class="sentiment-strip" style="background:${meta.sentimentColor}"></div>` : ''}
      ${image ? `<img src="${image}" alt="" loading="lazy" />` : ''}
      <h4>
        ${meta.frontmatter?.title || meta.filename}
      </h4>
      <div class="subtext">
        ${date} · ${mins} min
      </div>
      ${renderPills({ subjects: meta.frontmatter?.tags || [], concerns: meta.frontmatter?.concern || [], form: inferForm(collection, meta) })}
      <p>
          ${truncate(stripTags(meta.frontmatter?.summary || meta.frontmatter?.description || meta.description || ''), 500)}
      </p>
    </a>`;
}

function getCollectionName(collection) {
  switch (collection) {
    case '':
      return 'Posts';
    case 'the-mirror-room/':
      return 'Stories';
    case 'chats/':
      return 'Chats';
    default:
      return collection;
  }
}

export function renderCollection(collection, index, showAll = false) {
  let collectionId = collection;
  let collectionName = collection;
  switch (collection) {
    case '':
      collectionId = 'blog';
      collectionName = 'Posts';
      break;
    case 'bookmarks/':
      return '';
    case 'notes/':
      return '';
    case 'pages/':
      return '';
    case 'the-mirror-room/':
      collectionId = 'stories';
      collectionName = 'Stories';
      break;
    case 'chats/':
      collectionId = 'chats';
      collectionName = 'Chats';
      break;
  }

  const posts = Object.entries(index)
    .reverse()
    .filter(
      ([key, _]) =>
        key !== 'index.js' && key !== 'README.md' && key !== '404.md',
    );

  return `
<section id="${collectionId}" class="wide-layout wide">
  <div class="container">
    <h3 class="section-title">${collectionName}</h3>
    <div class="grid">
      ${posts.map(([key, meta]) => renderCard(collection, meta)).join('\n')}
    </div>
  </div>
</section>`;
}

function extractDate(filename) {
  // Strip any path prefix (e.g., "chats/", "the-mirror-room/")
  const basename = filename.includes('/')
    ? filename.split('/').pop()
    : filename;
  return basename.substring(0, 10);
}

