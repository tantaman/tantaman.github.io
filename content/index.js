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

  // Sort by date (from frontmatter if available, otherwise from filename) and take most recent 12
  const recentPosts = allPosts
    .sort((a, b) => {
      const dateA = a.meta.frontmatter?.date || a.meta.compiledFilename.substring(0, 10);
      const dateB = b.meta.frontmatter?.date || b.meta.compiledFilename.substring(0, 10);
      return dateB.localeCompare(dateA);
    })
    .slice(0, 12);

  return `
<section id="hero">
  <img src="/img/avatar-angry.png" alt="Stoic guardian meditating" />
  <!-- <h2>Words&nbsp;Forged&nbsp;in&nbsp;Fire</h2> -->
  <p>tales, reflections, and evolving ideas.</p>
</section>
<section id="recent">
  <div class="container">
    <h3 class="section-title">Recent</h3>
    <div class="grid">
      ${recentPosts.map(({ collection, key, meta }) => renderCard(collection, meta)).join('\n')}
    </div>
  </div>
</section>`;
}

function renderCard(collection, meta) {
  const collectionLabel = getCollectionName(collection);
  const date = meta.frontmatter?.date || extractDate(meta.compiledFilename);

  return `
    <a class="card" href="${meta.compiledFilename}">
      <h4>
        ${meta.frontmatter?.title || meta.filename}
      </h4>
      <div class="subtext">
        ${date} · ${collectionLabel} · ${joinTags(meta.frontmatter)}
      </div>
      <p>
          ${meta.frontmatter?.description || meta.description || ''}
      </p>
    </a>`;
}

function getCollectionName(collection) {
  switch (collection) {
    case '':
      return 'Blog';
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
      collectionName = 'Blog';
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
<section id="${collectionId}">
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
  return filename.substring(0, 10);
}

function joinTags(frontmatter) {
  return (frontmatter?.tags || []).join(', ');
}
