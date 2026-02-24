import { indexFrontmatter, contentDirs } from '@tantaman/sitecompiler';

export default async function postsManifest() {
  return {
    compiledFilename: 'posts-manifest.json',
    content: async () => {
      const indices = await indexFrontmatter();
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
              collection: collection || 'root',
              color: meta.sentimentColor || null,
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
