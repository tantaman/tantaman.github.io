import { bundleMDX } from 'mdx-bundler';
import fs from 'fs';
import path from 'path';

async function build(collection) {
  const dest = './dist/' + collection;
  const files = await fs.promises.readdir('./site/' + collection);
  const artifacts = await Promise.all(
    files.map(async (file) => [
      dest + '/' + file,
      await bundleMDX({
        file: path.resolve('./site/' + collection + '/' + file),
        cwd: path.resolve('./site/' + collection),
      }),
    ]),
  );

  console.log(artifacts);

  await fs.promises.mkdir(dest, { recursive: true });
  await Promise.all(
    artifacts.map(
      async ([path, a]) => await fs.promises.writeFile(path, JSON.stringify(a)),
    ),
  );
}

await build('blog');
