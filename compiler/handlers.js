import { bundleMDX } from 'mdx-bundler';
import fs from 'fs';

export default {
  async mdx(file, cwd) {
    const ret = await bundleMDX({
      file,
      cwd,
    });

    return ret;
  },

  async md(file, cwd) {
    const code = await fs.promises.readFile(file, { encoding: 'utf8' });
    return {
      code,
      frontmatter: {},
    };
  },

  async json(file, cwd) {
    const contents = await fs.promises.readFile(file, { encoding: 'utf8' });
    return JSON.parse(contents);
  },

  html(file, cwd) {},
};
