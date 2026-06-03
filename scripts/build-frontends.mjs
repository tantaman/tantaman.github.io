#!/usr/bin/env node
// Builds the Vite frontend packages, skipping any whose compiled output in
// docs/ is newer than all of its sources. This avoids re-running `vite build`
// for projects that haven't changed (used by `pnpm build` and the pre-push hook).
//
// Usage:
//   node scripts/build-frontends.mjs                 # build all stale projects
//   node scripts/build-frontends.mjs thoughts lists  # build only the named (stale) projects
//   FORCE=1 node scripts/build-frontends.mjs         # rebuild everything
//   node scripts/build-frontends.mjs --force         # rebuild everything

import { spawnSync } from 'node:child_process';
import { statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// name -> { dir, out, deps } (paths relative to repoRoot)
const PROJECTS = {
  thoughts: { dir: 'packages/thoughts', out: 'docs/thoughts', deps: ['packages/editor'] },
  wardrobe: { dir: 'packages/wardrobe', out: 'docs/wardrobe' },
  lists: { dir: 'packages/lists', out: 'docs/lists' },
  comments: { dir: 'packages/comments', out: 'docs/comments' },
  'dha-report-app': { dir: 'packages/dha-report-app', out: 'docs/dha-report-app' },
};

// Global inputs that invalidate every project when touched (dependency changes).
const GLOBAL_INPUTS = ['pnpm-lock.yaml'];

// Directory/file names to skip when scanning a package's sources.
const IGNORE_NAMES = new Set(['node_modules', 'dist', '.git', '.turbo', '.vite']);
// Generated-at-build files live under src/ but track the build, not the source.
const IGNORE_BASENAMES = new Set(['routeTree.gen.ts']);

/** Newest mtime (ms) under a path, or 0 if it doesn't exist. */
function maxMtime(target) {
  let max = 0;
  const walk = (p) => {
    let st;
    try {
      st = statSync(p);
    } catch {
      return; // missing path contributes nothing
    }
    const base = path.basename(p);
    if (IGNORE_NAMES.has(base) || IGNORE_BASENAMES.has(base)) return;
    if (st.isDirectory()) {
      for (const entry of readdirSync(p)) walk(path.join(p, entry));
    } else if (st.mtimeMs > max) {
      max = st.mtimeMs;
    }
  };
  walk(target);
  return max;
}

const abs = (p) => path.join(repoRoot, p);
const args = process.argv.slice(2).filter((a) => a !== '--force');
const force = process.env.FORCE === '1' || process.argv.includes('--force');

const requested = args.length ? args : Object.keys(PROJECTS);
const unknown = requested.filter((name) => !PROJECTS[name]);
if (unknown.length) {
  console.error(`Unknown project(s): ${unknown.join(', ')}`);
  console.error(`Known projects: ${Object.keys(PROJECTS).join(', ')}`);
  process.exit(1);
}

const globalInputMtime = Math.max(0, ...GLOBAL_INPUTS.map((p) => maxMtime(abs(p))));

for (const name of requested) {
  const { dir, out, deps = [] } = PROJECTS[name];

  const inputMtime = Math.max(
    maxMtime(abs(dir)),
    globalInputMtime,
    ...deps.map((d) => maxMtime(abs(d))),
  );
  const outputMtime = maxMtime(abs(out));

  if (!force && outputMtime > inputMtime) {
    console.log(`✓ ${name}: up to date, skipping build`);
    continue;
  }

  console.log(`▶ ${name}: building...`);
  const result = spawnSync('pnpm', ['build'], {
    cwd: abs(dir),
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`✗ ${name}: build failed`);
    process.exit(result.status ?? 1);
  }
}
