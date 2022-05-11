import fs from 'fs';
import path from 'path';
import handlers from './handlers.js';
import postProcess from './postProcess.js';

const builtDir = './public/built/';

async function build(collection) {
  const dest = builtDir + collection;
  const files = await fs.promises.readdir('./content/' + collection);
  const artifacts = await Promise.all(
    files.map(async (file) => {
      return [
        dest + '/' + file,
        await handlers[path.extname(file).substring(1)](
          path.resolve('./content/' + collection + '/' + file),
          path.resolve('./content/' + collection),
          files,
        ),
      ];
    }),
  );

  const theIndex = index(artifacts);

  await fs.promises.mkdir(dest, { recursive: true });
  await Promise.all(
    artifacts.map(async ([path, a]) => {
      const [stadalonePath, content] = postProcess(path, a, theIndex);
      return await fs.promises.writeFile(stadalonePath, content);
    }),
  );
}

await Promise.all([
  build('blog'),
  build('pages'),
  build('tweets'),
  build('crumbs'),
]);

/**
 * @param {[string, {frontmatter: {[key: string]: any}}][]} artifacts
 */
function index(artifacts) {
  const ret = artifacts.reduce((l, r) => {
    l[path.basename(r[0])] = {
      frontmatter: r[1].frontmatter || {},
      greymatter: {},
    };
    return l;
  }, {});
  return ret;
}
