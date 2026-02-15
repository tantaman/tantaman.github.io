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

export default async function tags(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/tags.css']),
          js: doc.js.concat(['/tags-browse.js']),
          title: 'Tags',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Tags - Tantamanlands',
          description: 'Explore posts organized by topic',
        })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await tagsPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Tags',
      description: 'Explore posts organized by topic',
    },
    greymatter: {},
  };
}

async function tagsPage() {
  const indices = await indexFrontmatter();

  // Group all posts by tag
  const tagMap = new Map();

  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/') return;

    let collectionName = collection;
    switch (collection) {
      case '':
        collectionName = 'blog';
        break;
      case 'the-mirror-room/':
        collectionName = 'stories';
        break;
      case 'chats/':
        collectionName = 'chats';
        break;
    }

    Object.entries(index).forEach(([key, postMeta]) => {
      if (key === 'index.js' || key === 'README.md' || key === '404.md' || key === 'tags.js') return;

      const tags = postMeta.frontmatter?.tags || [];
      const title = postMeta.frontmatter?.title || key;
      const url = postMeta.compiledFilename;
      const description = postMeta.frontmatter?.description || postMeta.description || '';
      const date = postMeta.frontmatter?.date || extractDate(postMeta.compiledFilename);

      tags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag).push({ title, url, description, date, collection: collectionName });
      });
    });
  });

  // Sort posts within each tag by date descending
  for (const posts of tagMap.values()) {
    posts.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Sort tags by count descending, then alphabetically
  const sortedTags = Array.from(tagMap.entries())
    .sort((a, b) => {
      const countDiff = b[1].length - a[1].length;
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    });

  const maxCount = sortedTags.length > 0 ? sortedTags[0][1].length : 1;
  const firstTagId = sortedTags.length > 0 ? tagId(sortedTags[0][0]) : '';

  return `
<section id="tags-page" class="wide">
  <nav class="tags-sidebar" role="tablist" aria-label="Tags">
    ${sortedTags.map(([tag, posts], i) => {
      const id = tagId(tag);
      const fill = Math.round((posts.length / maxCount) * 100);
      const active = i === 0;
      return `<button class="tag-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" aria-controls="panel-${id}" data-tag="${id}" style="--fill: ${fill}%">${tag} <span class="tag-count">${posts.length}</span></button>`;
    }).join('\n    ')}
  </nav>
  <div class="tags-panels">
    ${sortedTags.map(([tag, posts], i) => {
      const id = tagId(tag);
      const hidden = i !== 0;
      return `
    <div class="tag-panel${!hidden ? ' active' : ''}" id="panel-${id}" role="tabpanel" data-tag="${id}"${hidden ? ' hidden' : ''}>
      <h3 class="panel-title">${tag}</h3>
      <ul class="tag-posts">
        ${posts.map(post => `
        <li class="tag-post">
          <a href="${post.url}">
            <span class="post-title">${post.title}</span>
            ${post.date ? `<span class="post-date">${post.date}</span>` : ''}
            ${post.description ? `<span class="post-description">${truncate(stripTags(post.description), 120)}</span>` : ''}
          </a>
        </li>`).join('')}
      </ul>
    </div>`;
    }).join('')}
  </div>
</section>`;
}

function tagId(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractDate(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  const candidate = basename.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : '';
}

function truncate(text, length) {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

function stripTags(html) {
  return (html || '').replace(/<[^>]*>/g, '');
}
