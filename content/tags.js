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
      return unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/tags.css']),
          title: 'Browse by Tag',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Browse by Tag - Tantamanlands',
          description: 'Explore posts organized by topic',
        })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .processSync(await tagsPage())
        .toString();
    },
    frontmatter: {
      title: 'Browse by Tag',
      description: 'Explore posts organized by topic',
    },
    greymatter: {},
  };
}

async function tagsPage() {
  const indices = await indexFrontmatter();

  // Group all posts by tag
  const tagMap = new Map();

  // Iterate through all collections
  Object.entries(indices).forEach(([collection, index]) => {
    // Skip bookmarks and notes
    if (collection === 'bookmarks/' || collection === 'notes/') {
      return;
    }

    // Get collection name for display
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

    // Process each post in the collection
    Object.entries(index).forEach(([key, postMeta]) => {
      // Skip non-content files
      if (key === 'index.js' || key === 'README.md' || key === '404.md' || key === 'tags.js') {
        return;
      }

      const tags = postMeta.frontmatter?.tags || [];
      const title = postMeta.frontmatter?.title || key;
      const url = postMeta.compiledFilename;
      const description = postMeta.frontmatter?.description || postMeta.description || '';

      // Add post to each of its tags
      tags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag).push({
          title,
          url,
          description,
          collection: collectionName,
        });
      });
    });
  });

  // Sort tags by count (descending), then alphabetically
  const sortedTags = Array.from(tagMap.entries())
    .sort((a, b) => {
      const countDiff = b[1].length - a[1].length;
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    });

  return `
<section id="tags-page">
  <div class="container">
    <h1 class="page-title">Browse by Tag</h1>
    <p class="page-description">Explore posts organized by topic. Click to expand each tag.</p>

    <div class="tags-list">
      ${sortedTags.map(([tag, posts]) => renderTagSection(tag, posts)).join('\n')}
    </div>
  </div>
</section>`;
}

function renderTagSection(tag, posts) {
  const count = posts.length;
  const tagId = tag.replace(/[^a-z0-9]/g, '-');

  return `
<details class="tag-section" id="${tagId}">
  <summary class="tag-header">
    <span class="tag-arrow">▸</span>
    <span class="tag-name">${tag}</span>
    <span class="tag-count">${count} ${count === 1 ? 'post' : 'posts'}</span>
  </summary>
  <ul class="tag-posts">
    ${posts.map(post => `
      <li class="tag-post">
        <a href="${post.url}">
          <span class="post-title">${post.title}</span>
          ${post.description ? `<span class="post-description">${truncate(post.description, 120)}</span>` : ''}
        </a>
      </li>
    `).join('')}
  </ul>
</details>`;
}

function truncate(text, length) {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}
