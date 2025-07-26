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

export default async function index(file, cwd, files) {
  return {
    content: async () => {
      return unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/home.css']),
          js: doc.js.concat(['/home.js']),
        })
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
<section id="hero">
  <img src="/img/avatar-angry.png" alt="Stoic guardian meditating" />
  <!-- <h2>Words&nbsp;Forged&nbsp;in&nbsp;Fire</h2> -->
  <p>tales, reflections, and evolving ideas.</p>
</section>
<section id="blog">
<div class="container">
<div className="grid">
  ${Object.entries(index)
    .reverse()
    .filter(
      ([key, _]) =>
        key !== 'index.js' && key !== 'README.md' && key !== '404.md',
    )
    .map(
      ([key, meta]) =>
        `
<a class="card" href="${meta.compiledFilename}">
  <h4>
    ${meta.frontmatter.title || key}
  </h4>
  <div class="subtext">
    ${extractDate(meta.compiledFilename)} · ${joinTags(meta.frontmatter)}
  </div>
  <p>
      ${meta.frontmatter.description || meta.description || ''}
  </p>
</a>`,
    )
    .join('\n')}
</div>
</div>
</section>
`;
}

function extractDate(filename) {
  return filename.substring(0, 10);
}

function joinTags(frontmatter) {
  return (frontmatter.tags || []).join(', ');
}
