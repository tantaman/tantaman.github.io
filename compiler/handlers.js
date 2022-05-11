import { bundleMDX } from 'mdx-bundler';
import fs from 'fs';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkWikiLink from 'remark-wiki-link';
import extractFromtmatter from 'remark-extract-frontmatter';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import toc from '@jsdevtools/rehype-toc';
import yaml from 'yaml';

import clojure from 'highlight.js/lib/languages/clojure';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import java from 'highlight.js/lib/languages/java';
import xml from 'highlight.js/lib/languages/xml';
import rust from 'highlight.js/lib/languages/rust';
import path from 'path';

export default {
  async mdx(file, cwd) {
    const ret = await bundleMDX({
      file,
      cwd,
    });

    // re-write code into a standalone format
    ret.code = `<script type="text/javascript">window.mdxBundle = ${JSON.stringify(
      ret.code,
    )}</script>`;

    return {
      compiledFilename: compiledFilename(file),
      content: ret.code,
      frontmatter: ret.frontmatter,
      greymatter: ret.greymatter,
    };
  },

  async md(file, cwd) {
    const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
    const parsed = await unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .use(extractFromtmatter, { yaml: yaml.parse })
      .use(remarkGfm)
      .use(remarkWikiLink)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeSlug)
      .use(toc)
      .use(rehypeAutolinkHeadings)
      .use(rehypeHighlight, {
        languages: { clojure, typescript, javascript, java, xml, rust },
      })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(contents);

    return {
      content: parsed.toString(),
      frontmatter: parsed.data,
      compiledFilename: compiledFilename(file),
      greymatter: {},
    };
  },

  async json(file, cwd) {
    const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
    return JSON.parse(contents);
  },

  async html(file, cwd) {
    const content = await fs.promises.readFile(file, { encoding: 'utf8' });
    return {
      content,
      frontmatter: {},
      compiledFilename: file,
      greymatter: {},
    };
  },

  // TODO: ideally we pass the index of all files and all their frontmatter.
  // of course excluding js files.
  // so requires 2 passes.
  // our maybe the js can return a function for `content` which will be invoked
  // with the index.
  async js(file, cwd, files) {
    // should js return a rehype doc?
    // probs.. so we can have all the same integrations as above.
    const module = await import(file);
    const ret = module.default(file, cwd, files);
    ret.compiledFilename = compiledFilename(file);
    return ret;
  },
};

function compiledFilename(file) {
  let ret = path.basename(file);
  return ret.substring(0, ret.lastIndexOf('.')) + '.html';
}

// https://unifiedjs.com/explore/package/rehype-meta/
