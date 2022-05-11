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
import yaml from 'yaml';

export default {
  async mdx(file, cwd) {
    const ret = await bundleMDX({
      file,
      cwd,
    });

    return ret;
  },

  async md(file, cwd) {
    const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
    const parsed = await unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .use(extractFromtmatter, { yaml: yaml.parse })
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .use(remarkWikiLink)
      .process(contents);
    return {
      code: parsed.toString(),
      frontmatter: parsed.data,
    };
  },

  async json(file, cwd) {
    const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
    return JSON.parse(contents);
  },

  html(file, cwd) {},
};
