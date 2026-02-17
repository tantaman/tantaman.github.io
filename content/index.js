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

export default async function index(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/home.css']),
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
  };
}

async function siteIndex() {
  const indices = await indexFrontmatter();

  // Collect all posts from relevant sections
  const allPosts = [];

  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/') return;

    Object.entries(index)
      .filter(([key, _]) =>
        key !== 'index.js' && key !== 'README.md' && key !== '404.md'
      )
      .forEach(([key, meta]) => {
        allPosts.push({
          collection,
          key,
          meta,
        });
      });
  });

  const sortedPosts = allPosts
    .sort((a, b) => {
      const dateA = a.meta.frontmatter?.date || extractDate(a.meta.compiledFilename);
      const dateB = b.meta.frontmatter?.date || extractDate(b.meta.compiledFilename);
      return dateB.localeCompare(dateA);
    });

  const featured = sortedPosts.slice(0, 5);
  const remaining = sortedPosts.slice(5);

  return `
<div class="home wide">
  <div class="masonry">
    ${featured.map(({ collection, meta }) => renderCard(collection, meta)).join('\n')}
  </div>
  ${remaining.length > 0 ? `
  <div class="more-grid">
    ${remaining.map(({ collection, meta }) => renderCard(collection, meta)).join('\n')}
  </div>` : ''}
</div>`;
}

function inferForm(collection, meta) {
  if (meta.frontmatter?.form) return meta.frontmatter.form;
  if (collection === 'the-mirror-room/') return 'story';
  if (collection === 'chats/') return 'chat';
  return 'essay';
}

function renderPills(collection, meta) {
  const subjects = (meta.frontmatter?.tags || []).map(s => `<span class="pill pill-subject" data-facet="subject" data-value="${tagId(s)}">${s}</span>`);
  const concerns = (meta.frontmatter?.concern || []).map(c => `<span class="pill pill-concern" data-facet="concern" data-value="${tagId(c)}">${c}</span>`);
  const formValue = inferForm(collection, meta);
  const form = `<span class="pill pill-form" data-facet="form" data-value="${tagId(formValue)}">${formValue}</span>`;
  const pills = [...subjects, ...concerns, form];
  return `<div class="card-pills">${pills.join('')}</div>`;
}

function tagId(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const CONCERN_ICON = {
  self: '👁', power: '⚡', craft: '🔧', ground: '⚓',
  knowledge: '💡', modernity: '⚙️', systems: '🔗',
};

function readingTime(wordCount) {
  return Math.max(1, Math.round((wordCount || 0) / 200));
}

function renderCard(collection, meta) {
  const collectionLabel = getCollectionName(collection);
  const date = meta.frontmatter?.date || extractDate(meta.compiledFilename);
  const image = meta.frontmatter?.image;
  const concernIcon = CONCERN_ICON[meta.frontmatter?.concern?.[0]] || '';
  const mins = readingTime(meta.wordCount);

  return `
    <a class="card" href="${meta.compiledFilename}">
      ${image ? `<img src="${image}" alt="" />` : ''}
      <h4>
        ${meta.frontmatter?.title || meta.filename}
      </h4>
      <div class="subtext">
        ${date} · ${collectionLabel}${concernIcon ? ` · ${concernIcon}` : ''} · ${mins} min
      </div>
      ${renderPills(collection, meta)}
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
      ${posts
        .map(([key, meta]) => renderCard(collection, meta))
        .join('\n')}
    </div>
  </div>
</section>`;
}

function extractDate(filename) {
  // Strip any path prefix (e.g., "chats/", "the-mirror-room/")
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  return basename.substring(0, 10);
}

function joinTags(frontmatter) {
  return (frontmatter?.tags || []).join(', ');
}

function stripTags(html) {
  return (html || '').replace(/<[^>]*>/g, '');
}

function truncate(str, max) {
  if (str.length <= max) return str;
  const cut = str.lastIndexOf(' ', max);
  return str.slice(0, cut > 0 ? cut : max) + '…';
}
