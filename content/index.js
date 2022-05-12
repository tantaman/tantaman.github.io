import { doc, meta, layout, rehypeDocument } from '@tantaman/sitecompiler';
import { h } from 'hastscript';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import { toHtml } from 'hast-util-to-html';
import rehypeParse from 'rehype-parse';

// TODO: put this thru the unified pipeline like markdown?
export default function index(file, cwd, files) {
  return {
    content: (index) => {
      return unified()
        .use(rehypeParse)
        .use(rehypeDocument, doc)
        .use(rehypeMeta, meta)
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .processSync(
          toHtml(
            h('ol', [
              Object.entries(index)
                .reverse()
                .filter(
                  ([key, meta]) => key !== 'index.js' && key !== 'README.md',
                )
                .map(([key, meta]) =>
                  h('li', h('a', { href: meta.compiledFilename }, key)),
                ),
            ]),
          ),
        )
        .toString();
    },
    frontmatter: {},
    greymatter: {},
  };
}
