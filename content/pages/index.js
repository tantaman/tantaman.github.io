import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
  contentDirs,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';

export default async function pages(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/home.css']),
        })
        .use(rehypeMeta, meta)
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await pagesIndex());

      return result.toString();
    },
    frontmatter: {
      title: 'Pages',
      description: 'All pages on Tantamanlands',
    },
    greymatter: {},
    dependencies: [...contentDirs()],
  };
}

async function pagesIndex() {
  const indices = await indexFrontmatter();
  const pagesIdx = indices['pages/'] || {};

  const pages = Object.entries(pagesIdx)
    .filter(([key]) => key !== 'index.js' && key !== 'README.md')
    .map(([key, meta]) => ({
      key,
      title: meta.frontmatter?.title || key.replace(/\.(md|mdx|html)$/, ''),
      url: meta.compiledFilename,
      description: meta.frontmatter?.description || meta.description || '',
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const items = pages
    .map(
      (p) => `
    <li>
      <a href="${p.url}">${p.title}</a>
      ${p.description ? `<p>${p.description}</p>` : ''}
    </li>`,
    )
    .join('\n');

  return `
<div class="container">
  <h1>Pages</h1>
  <ul class="page-list">
    ${items}
  </ul>
</div>`;
}
