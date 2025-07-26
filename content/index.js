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

// TODO: put this thru  the unified pipeline like  markdown?
export default async function index(file, cwd, files) {
  return {
    content: async () => {
      return unified()
        .use(rehypeParse)
        .use(rehypeDocument, doc)
        .use(rehypeMeta, meta)
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .processSync(await blogIndex())
        .toString();
    },
    frontmatter: {},
    greymatter: {},
  };
}

async function blogIndex() {
  const i = await indexFrontmatter();
  const index = i[''];
  // get all front matter from all md & mdx files in `content/`
  return `
<div className="grid post-grid gap-4">
  ${Object.entries(index)
    .reverse()
    .filter(
      ([key, _]) =>
        key !== 'index.js' && key !== 'README.md' && key !== '404.md',
    )
    .map(
      ([key, meta]) =>
        `
<a class="entry-card" href="${meta.compiledFilename}">
  <span>
    ${meta.frontmatter.title || key}
  </span>
  <div class="subtext">
    ${extractDate(meta.compiledFilename)} · ${joinTags(meta.frontmatter)}
  </div>
  <hr />
  <div class="summary">
      ${meta.meta?.description || meta.frontmatter.description || ''}
  </div>
</a>`,
    )
    .join('\n')}
</div>
`;
}

function extractDate(filename) {
  return filename.substring(0, 10);
}

function joinTags(frontmatter) {
  return (frontmatter.tags || []).join(', ');
}
