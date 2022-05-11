import fs from 'fs';
import path from 'path';
import handlers from './handlers.js';

async function build(collection) {
  const dest = './public/built/' + collection;
  const files = await fs.promises.readdir('./content/' + collection);
  const artifacts = await Promise.all(
    files.map(async (file) => {
      return [
        dest + '/' + file,
        await handlers[path.extname(file).substring(1)](
          path.resolve('./content/' + collection + '/' + file),
          path.resolve('./content/' + collection),
        ),
      ];
    }),
  );

  await fs.promises.mkdir(dest, { recursive: true });
  await Promise.all(
    artifacts.map(async ([path, a]) => {
      if (a.frontmatter?.standalone) {
        const [stadalonePath, code] = makeStandalone(
          path,
          a.code,
          a.frontmatter?.standalone,
        );
        return await fs.promises.writeFile(stadalonePath, code);
      }
      return await fs.promises.writeFile(path + '.json', JSON.stringify(a));
    }),
  );

  await fs.promises.writeFile(
    dest + '/index.json',
    JSON.stringify(index(artifacts)),
  );
}

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

await Promise.all([
  build('blog'),
  build('pages'),
  build('tweets'),
  build('crumbs'),
]);

function makeStandalone(path, content, ext) {
  return [
    `${path}.${ext}`,
    `<!DOCTYPE html><html><body>${content}</body></html>`,
  ];
}
