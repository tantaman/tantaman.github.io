import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlers from './handlers.js';
import postProcess from './postProcess.js';

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

// Compiler change detection — runs once at module load
let forceFromCompiler = false;
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tsbuildInfoPath = path.join(__dirname, '.tsbuildinfo');
  const stat = await fs.promises.stat(tsbuildInfoPath);
  const currentMtime = stat.mtime.getTime();
  if (buildCache._compilerMtime !== currentMtime) {
    forceFromCompiler = true;
    buildCache._compilerMtime = currentMtime;
    console.log('Compiler changed, forcing rebuild');
  }
} catch (e) {
  // .tsbuildinfo not found, skip compiler change detection
}

async function snapshotDeps(dependencies) {
  const snapshot = {};
  for (const dep of dependencies) {
    try {
      const stat = await fs.promises.stat(dep);
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(dep);
        const mtimes = {};
        for (const f of files) {
          try {
            const fstat = await fs.promises.stat(path.join(dep, f));
            mtimes[f] = fstat.mtime.getTime();
          } catch (e) {
            // skip files we can't stat
          }
        }
        snapshot[dep] = { type: 'dir', listing: files.sort(), mtimes };
      } else {
        snapshot[dep] = { type: 'file', mtime: stat.mtime.getTime() };
      }
    } catch (e) {
      snapshot[dep] = { type: 'missing' };
    }
  }
  return snapshot;
}

async function depsChanged(cachedDeps) {
  if (!cachedDeps) return true;
  for (const [dep, cached] of Object.entries(cachedDeps)) {
    try {
      const stat = await fs.promises.stat(dep);
      if (cached.type === 'dir') {
        if (!stat.isDirectory()) return true;
        const files = await fs.promises.readdir(dep);
        if (JSON.stringify(files.sort()) !== JSON.stringify(cached.listing))
          return true;
        for (const f of files) {
          try {
            const fstat = await fs.promises.stat(path.join(dep, f));
            if (fstat.mtime.getTime() !== cached.mtimes[f]) return true;
          } catch (e) {
            return true;
          }
        }
      } else if (cached.type === 'file') {
        if (stat.isDirectory()) return true;
        if (stat.mtime.getTime() !== cached.mtime) return true;
      } else if (cached.type === 'missing') {
        return true; // was missing, now exists
      }
    } catch (e) {
      if (cached.type !== 'missing') return true;
      // still missing — no change
    }
  }
  return false;
}

export default async function build(collection, forceRebuild = false) {
  const effectiveForce = forceRebuild || forceFromCompiler;
  const dest = builtDir + collection;
  const contentDir = './content/' + collection;
  const files = await fs.promises.readdir(contentDir);

  const filesToProcess = [];

  if (effectiveForce) {
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

        if (ext === 'js') {
          // JS file: check own mtime + dependencies
          const cached = buildCache[cacheKey];
          const cachedMtime =
            typeof cached === 'object' ? cached.mtime : null;
          if (
            !cached ||
            typeof cached === 'number' || // old format, force upgrade
            cachedMtime !== lastModified ||
            !outputExists
          ) {
            filesToProcess.push(file);
          } else if (
            !cached.deps ||
            (await depsChanged(cached.deps))
          ) {
            filesToProcess.push(file);
          }
        } else {
          // Non-JS: simple mtime check
          if (
            !buildCache[cacheKey] ||
            buildCache[cacheKey] !== lastModified ||
            !outputExists
          ) {
            filesToProcess.push(file);
            buildCache[cacheKey] = lastModified;
          }
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

        return [dest + '/' + file, artifact, file];
      }),
    )
  ).filter((a) => a != null);

  // Update cache for built files
  for (const [, artifact, file] of artifacts) {
    const cacheKey = `${collection}/${file}`;
    const filePath = path.join(contentDir, file);
    const ext = path.extname(file).substring(1);
    try {
      const stat = await fs.promises.stat(filePath);
      const lastModified = stat.mtime.getTime();
      if (ext === 'js') {
        const entry = { mtime: lastModified };
        if (artifact.dependencies) {
          entry.deps = await snapshotDeps(artifact.dependencies);
        }
        buildCache[cacheKey] = entry;
      } else {
        buildCache[cacheKey] = lastModified;
      }
    } catch (e) {
      // skip cache update if we can't stat
    }
  }

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

  // Save cache
  await fs.promises.writeFile(cacheFile, JSON.stringify(buildCache, null, 2));
}
