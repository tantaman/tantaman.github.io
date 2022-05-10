import { bundleMDX } from 'mdx-bundler';
import fs from 'fs';
import path from 'path';

async function build(collection) {
  const dest = './public/built/' + collection;
  const files = await fs.promises.readdir('./content/' + collection);
  const artifacts = await Promise.all(
    files.map(async (file) => [
      dest + '/' + file,
      await bundleMDX({
        file: path.resolve('./content/' + collection + '/' + file),
        cwd: path.resolve('./content/' + collection),
      }),
    ]),
  );

  await fs.promises.mkdir(dest, { recursive: true });
  await Promise.all(
    artifacts.map(
      async ([path, a]) =>
        await fs.promises.writeFile(path + '.json', JSON.stringify(a)),
    ),
  );
}

await Promise.all([
  build('blog'),
  build('pages'),
  build('tweets'),
  build('crumbs'),
]);
