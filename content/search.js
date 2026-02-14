import {
  doc,
  meta,
  layout,
  rehypeDocument,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';

export default async function search(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/search.css']),
          js: doc.js.concat(['/search.js']),
          title: 'Search',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Search - Tantamanlands',
          description: 'Search all posts and content',
        })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(searchPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Search',
      description: 'Search all posts and content',
    },
    greymatter: {},
  };
}

function searchPage() {
  return `
<section id="search-page" class="wide-layout">
  <div class="search-header">
    <h3 class="section-title">Search</h3>
  </div>
  <div class="search-container">
    <input
      type="text"
      id="search-input"
      placeholder="Type to search..."
      autocomplete="off"
      autofocus
    />
    <div id="search-status"></div>
  </div>
  <div id="search-results"></div>
</section>`;
}
