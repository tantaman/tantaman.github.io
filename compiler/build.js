import { bundleMDX } from 'mdx-bundler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function build() {
  const files = await fs.promises.readdir('./site/blog');
  return await Promise.all(
    files.map((file) =>
      bundleMDX({
        file: path.resolve('./site/blog/' + file),
        cwd: path.resolve('./site/blog'),
      }),
    ),
  );
}

const builtPosts = await build();
