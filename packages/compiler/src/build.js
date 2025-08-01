import fs from 'fs';
import path from 'path';
import handlers from './handlers.js';
import postProcess from './postProcess.js';
import { generatePodcastRSS } from './podcast-rss.js';

const builtDir = './docs/';
const cacheFile = '.build-cache.json';

let buildCache = {};

// Load existing cache
try {
  const cacheData = await fs.promises.readFile(cacheFile, 'utf8');
  buildCache = JSON.parse(cacheData);
} catch (e) {
  buildCache = {};
}

export default async function build(collection, forceRebuild = false) {
  const dest = builtDir + collection;
  const contentDir = './content/' + collection;
  const files = await fs.promises.readdir(contentDir);

  const filesToProcess = [];

  if (forceRebuild) {
    // If JS changed or force rebuild, process all files
    filesToProcess.push(...files);
    console.log('Force rebuilding all files');
  } else {
    // Only process files that have changed
    for (const file of files) {
      const filePath = path.join(contentDir, file);
      try {
        const stat = await fs.promises.stat(filePath);
        const lastModified = stat.mtime.getTime();
        const cacheKey = `${collection}/${file}`;

        // Check if output file exists and is newer than source
        const ext = path.extname(file).substring(1);
        const handler = handlers[ext];
        if (!handler) continue;

        const outputPath = path.join(
          dest,
          file.replace(path.extname(file), '.html'),
        );
        let outputExists = false;
        try {
          await fs.promises.access(outputPath);
          outputExists = true;
        } catch (e) {
          // Output doesn't exist
        }

        if (
          !buildCache[cacheKey] ||
          buildCache[cacheKey] !== lastModified ||
          !outputExists
        ) {
          filesToProcess.push(file);
          buildCache[cacheKey] = lastModified;
        }
      } catch (e) {
        // If we can't stat the file, include it
        filesToProcess.push(file);
      }
    }

    if (filesToProcess.length === 0) {
      console.log(`No changes detected in ${collection || 'root'} collection`);
      return;
    }

    console.log(
      `Processing ${filesToProcess.length} changed files in ${
        collection || 'root'
      } collection`,
    );
  }

  const artifacts = (
    await Promise.all(
      filesToProcess.map(async (file) => {
        const ext = path.extname(file).substring(1);
        const handler = handlers[ext];
        if (!handler) {
          return null;
        }
        let artifact;
        try {
          artifact = await handler(
            path.resolve('./content/' + collection + file),
            path.resolve('./content/' + collection),
          );
        } catch (e) {
          console.error('Failed compiling ' + file);
          console.error(e);
          return null;
        }

        return [dest + '/' + file, artifact];
      }),
    )
  ).filter((a) => a != null);

  if (artifacts.length === 0) {
    return;
  }

  await fs.promises.mkdir(dest, { recursive: true });
  await Promise.all(
    artifacts.map(async ([destPath, a]) => {
      const [stadalonePath, content] = await postProcess(destPath, a);
      await Promise.all([
        await fs.promises.writeFile(stadalonePath, content),
        ...[
          (a.companionFiles || []).map((f) => {
            fs.promises.writeFile(
              path.dirname(stadalonePath) + '/' + f.name,
              f.content,
            );
          }),
        ],
      ]);
    }),
  );

  // Generate podcast RSS feed for root collection only
  if (collection === '' && (filesToProcess.length > 0 || forceRebuild)) {
    console.log('Generating podcast RSS feed...');
    try {
      const rssContent = await generatePodcastRSS(contentDir);
      if (rssContent) {
        await fs.promises.writeFile(path.join(builtDir, 'podcast.xml'), rssContent);
        console.log('Podcast RSS feed generated: docs/podcast.xml');
      }
    } catch (error) {
      console.error('Failed to generate podcast RSS feed:', error);
    }
  }

  // Save cache
  await fs.promises.writeFile(cacheFile, JSON.stringify(buildCache, null, 2));
}
