import path from 'path';
import { collections } from './collections.js';
import fs from 'fs';
import { parse } from 'yaml';

let cached: IndexShape | null = null;

export type IndexShape = {
  [collection: string]: {
    [filename: string]: FileMeta;
  };
};

export type FileMeta = {
  compiledFilename: string;
  frontmatter: Record<string, any>;
};

export async function indexFrontmatter(): Promise<IndexShape> {
  if (cached) return cached;

  cached = Object.fromEntries(
    await Promise.all(
      collections.map(async (collection) => {
        const contentDir = './content/' + collection;
        const files = await fs.promises.readdir(contentDir);

        const mdFiles = files.filter((file) => {
          const extname = path.extname(file);
          const basename = path.basename(file, extname);
          return (
            (extname === '.md' || extname === '.mdx') &&
            basename !== '404.md' &&
            basename !== 'README.md'
          );
        });

        const mdIndex = Object.fromEntries(
          await Promise.all(
            mdFiles.map(async (file) => {
              // read the file
              const filePath = path.join(contentDir, file);
              const content = await fs.promises.readFile(filePath, 'utf-8');

              // parse the frontmatter
              const frontmatter = parseFrontmatter(content);
              return [
                file,
                {
                  compiledFilename:
                    collection +
                    path.basename(file, path.extname(file)) +
                    '.html',
                  frontmatter,
                },
              ] as const;
            }),
          ),
        );

        return [collection, mdIndex] as const;
      }),
    ),
  );

  return cached;
}

function parseFrontmatter(content: string) {
  // frontmatter is the first block of YAML in the content
  // at the very beginning of the file
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const frontmatter = match[1];
  return parse(frontmatter);
}
