import { indexFrontmatter, contentDirs } from '@tantaman/sitecompiler';

const SITE_URL = 'https://tantaman.com';

export default async function feed() {
  return {
    compiledFilename: 'feed.xml',
    content: async () => {
      const indices = await indexFrontmatter();
      const posts = [];

      Object.entries(indices).forEach(([collection, index]) => {
        if (collection === 'bookmarks/' || collection === 'notes/' || collection === 'pages/') return;

        Object.entries(index)
          .filter(([key]) => key !== 'index.js' && key !== 'README.md' && key !== '404.md' && key !== 'feed.js')
          .forEach(([key, meta]) => {
            posts.push({ collection, key, meta });
          });
      });

      posts.sort((a, b) => {
        const dateA = a.meta.frontmatter?.date || extractDate(a.meta.compiledFilename);
        const dateB = b.meta.frontmatter?.date || extractDate(b.meta.compiledFilename);
        return dateB.localeCompare(dateA);
      });

      const dated = posts.filter(({ meta }) => {
        const d = meta.frontmatter?.date || extractDate(meta.compiledFilename);
        return !isNaN(new Date(d + 'T00:00:00Z').getTime());
      });

      const items = dated.slice(0, 20).map(({ meta }) => {
        const title = escapeXml(meta.frontmatter?.title || meta.filename || '');
        const link = `${SITE_URL}/${meta.compiledFilename}`;
        const dateStr = meta.frontmatter?.date || extractDate(meta.compiledFilename);
        const pubDate = toRFC822(dateStr);
        const description = escapeXml(meta.frontmatter?.description || meta.description || '');

        return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
      });

      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tantamanlands</title>
    <link>${SITE_URL}</link>
    <description>Matt Wonlaw's blog</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`;
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

function toRFC822(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toUTCString();
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
