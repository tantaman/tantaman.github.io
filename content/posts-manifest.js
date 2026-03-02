import { indexFrontmatter, contentDirs, inferForm } from '@tantaman/sitecompiler';
import fs from 'fs';

export default async function postsManifest() {
  return {
    compiledFilename: 'posts-manifest.json',
    content: async () => {
      const indices = await indexFrontmatter();

      let memeCache = {};
      try {
        memeCache = JSON.parse(await fs.promises.readFile('.meme-cache.json', 'utf-8'));
      } catch {}

      const posts = [];

      Object.entries(indices).forEach(([collection, index]) => {
        if (collection === 'bookmarks/' || collection === 'notes/' || collection === 'pages/') return;

        Object.entries(index)
          .filter(([key]) => key !== 'index.js' && key !== 'README.md' && key !== '404.md' && key !== 'feed.js' && key !== 'posts-manifest.js' && key !== 'tags.js' && key !== 'graph.js' && key !== 'stories.js')
          .forEach(([key, meta]) => {
            const fm = meta.frontmatter || {};
            const slug = meta.compiledFilename?.replace(/\.html$/, '') || key.replace(/\.(md|mdx)$/, '');
            const date = fm.date || extractDate(meta.compiledFilename || key);
            posts.push({
              slug,
              title: fm.title || slug,
              summary: fm.summary || fm.description || meta.description || '',
              date,
              tags: fm.tags || [],
              concern: fm.concern || [],
              form: inferForm(collection, meta),
              kind: fm.kind || null,
              collection: collection || 'root',
              color: meta.sentimentColor || null,
              image: fm.image || meta.firstImage || null,
              thesis: memeCache[fm.title || slug] || null,
            });
          });
      });

      posts.sort((a, b) => b.date.localeCompare(a.date));

      return JSON.stringify(posts);
    },
    frontmatter: {},
    greymatter: {},
    dependencies: contentDirs(),
  };
}

function extractDate(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  return basename.substring(0, 10);
}
