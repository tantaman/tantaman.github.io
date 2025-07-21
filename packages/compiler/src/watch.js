import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { startDevServer, notifyReload } from './dev-server.js';

const execAsync = promisify(exec);

const DEBOUNCE_DELAY = 300; // ms
let buildTimeout = null;

const collections = ['', 'bookmarks/', 'notes/', 'the-mirror-room/'];

export default async function watch() {
  console.log('Starting watch mode and dev server...');
  console.log('Watching for changes in:');
  console.log('- packages/compiler/src/ (TypeScript)');
  console.log('- content/ (Content files)');

  const server = await startDevServer();

  // Watch TypeScript compiler source
  const compilerWatcher = fs.watch(
    './packages/compiler/src',
    { recursive: true },
    (eventType, filename) => {
      if ((filename && filename.endsWith('.ts')) || filename.endsWith('.js')) {
        console.log(`TypeScript file changed: ${filename}`);
        debouncedBuild('typescript');
      }
    },
  );

  // Watch content directories
  const contentWatchers = collections
    .map((collection) => {
      const contentPath = `./content/${collection}`;
      try {
        return fs.watch(
          contentPath,
          { recursive: true },
          (eventType, filename) => {
            if (filename) {
              console.log(`Content file changed: ${collection}${filename}`);
              debouncedBuild('content', collection);
            }
          },
        );
      } catch (e) {
        console.warn(`Could not watch ${contentPath}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);

  function debouncedBuild(type, collection = null) {
    if (buildTimeout) {
      clearTimeout(buildTimeout);
    }

    buildTimeout = setTimeout(async () => {
      try {
        if (type === 'typescript') {
          console.log('Building TypeScript compiler...');
          await execAsync('cd packages/compiler && pnpm build');
          console.log('TypeScript build complete');

          // Also rebuild content after compiler changes
          console.log('Rebuilding all content...');
          await execAsync('sitecompiler');
          console.log('Content build complete');
        } else if (type === 'content') {
          console.log(
            `Building content for collection: ${collection || 'root'}`,
          );
          await execAsync('sitecompiler');
          console.log('Content build complete');
        }

        notifyReload();
      } catch (error) {
        console.error(`Build failed:`, error.message);
      }
    }, DEBOUNCE_DELAY);
  }

  // Initial build
  debouncedBuild('typescript');

  // Cleanup function
  const cleanup = () => {
    compilerWatcher.close();
    contentWatchers.forEach((watcher) => watcher?.close());
    if (buildTimeout) {
      clearTimeout(buildTimeout);
    }
    server.close();
  };

  // Handle process termination
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  return cleanup;
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down watch mode...');
  process.exit(0);
});
