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

export default async function thoughts(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/thoughts.css']),
          js: doc.js.concat(['/thoughts.js']),
          title: 'Thoughts',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Thoughts - Tantamanlands',
          description: 'Quick thoughts and ideas',
        })
        .use(() => (tree, file) => {
          file.data.matter = { noHeader: true };
        })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(thoughtsPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Thoughts',
      description: 'Quick thoughts and ideas',
      noHeader: true,
    },
    greymatter: {},
    dependencies: [],
  };
}

function thoughtsPage() {
  return `
<section id="thoughts-page">
  <header class="thoughts-header">
    <a href="/" class="thoughts-back">tantaman</a>
    <h1>Thoughts</h1>
  </header>
  <div class="thoughts-form-wrap" id="thoughts-form-wrap" style="display:none">
    <form id="thoughts-form">
      <textarea id="thought-input" placeholder="What's on your mind?" maxlength="1000" rows="3"></textarea>
      <div class="thoughts-form-footer">
        <span class="char-count" id="char-count">0 / 1000</span>
        <button type="submit" id="thought-submit">Post</button>
      </div>
    </form>
  </div>
  <div id="thoughts-list"></div>
  <button id="load-more" style="display:none">Load more</button>
  <button id="secret-toggle" class="secret-toggle" title="Set secret">&#128274;</button>
</section>`;
}
