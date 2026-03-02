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
  renderAuthorLogosHtml,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import { readFile } from 'node:fs/promises';

const THUMB_DIR = './docs/meme-thumbs';
const THUMB_URL_PREFIX = '/meme-thumbs';
const THUMB_WIDTH = 960;

export default async function index(file, cwd, files) {
  return {
    content: async () => {
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
        .process(await siteIndex());

      return result.toString();
    },
    frontmatter: {},
    greymatter: {},
    dependencies: [...contentDirs(), '.meme-cache.json'],
  };
}

async function loadCache() {
  try {
    const data = await readFile('.meme-cache.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function siteIndex() {
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

  const remainingCards = await Promise.all(
    remaining.map(async ({ collection, meta: postMeta }) => {
      const rawImage = postMeta.frontmatter?.image || postMeta.firstImage;
      const image = await generateThumbnail(rawImage, THUMB_DIR, THUMB_URL_PREFIX, THUMB_WIDTH);
      return renderCard(collection, postMeta, image);
    }),
  );

  return `
<div class="home wide">
  <div class="masonry">
    ${featuredCards.join('\n')}
  </div>
  ${
    remainingCards.length > 0
      ? `
  <div class="more-grid">
    ${remainingCards.join('\n')}
  </div>`
      : ''
  }
</div>`;
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
  const authorLogos = renderAuthorLogosHtml(meta.frontmatter?.author);

  return `
    <a class="card" href="${meta.compiledFilename}">
      ${meta.sentimentColor ? `<div class="sentiment-strip" style="background:${meta.sentimentColor}"></div>` : ''}
      ${image ? `<img src="${image}" alt="" loading="lazy" />` : ''}
      <h4>
        ${meta.frontmatter?.title || meta.filename}
      </h4>
      <div class="subtext">
        ${date} · ${mins} min · ${authorLogos}
      </div>
      ${renderPills({ subjects: meta.frontmatter?.tags || [], concerns: meta.frontmatter?.concern || [], form: inferForm(collection, meta), kind: meta.frontmatter?.kind })}
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

