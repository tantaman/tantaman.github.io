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
<div id="thoughts-page">
  <aside class="thoughts-sidebar">
    <nav class="thoughts-nav">
      <a href="/" class="thoughts-nav-link">Home</a>
      <a href="/tags.html" class="thoughts-nav-link">Browse</a>
      <a href="/graph.html" class="thoughts-nav-link">Graph</a>
      <a href="/thoughts.html" class="thoughts-nav-link active">Thoughts</a>
      <a href="/pages/mcp.html" class="thoughts-nav-link">MCP</a>
    </nav>
  </aside>
  <main class="thoughts-feed">
    <div class="thoughts-form-wrap" id="thoughts-form-wrap" style="display:none">
      <form id="thoughts-form">
        <div class="compose-area">
          <textarea id="thought-input" placeholder="What's on your mind?" maxlength="1000" rows="3"></textarea>
        </div>
        <div class="compose-file-row">
          <label class="compose-file-btn" for="thought-file">Attach files</label>
          <input type="file" id="thought-file" multiple style="display:none">
          <span class="compose-file-name" id="thought-file-label"></span>
          <button type="button" class="compose-file-clear" id="thought-file-clear">&times;</button>
        </div>
        <div class="thoughts-form-footer">
          <span class="char-count" id="char-count">0 / 1000</span>
          <button type="submit" id="thought-submit">Post</button>
        </div>
      </form>
    </div>
    <div id="thoughts-list"></div>
    <button id="load-more" style="display:none">Load more</button>
  </main>
  <aside class="thoughts-tags-sidebar" id="tags-sidebar">
    <div class="tags-sidebar-title">Tags</div>
    <div id="tags-list"></div>
  </aside>
  <button id="secret-toggle" class="secret-toggle" title="Set secret">&#128274;</button>
</div>`;
}
