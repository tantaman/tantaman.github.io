// sync-assets — bootstrap the legacy static image corpus into this self-contained app.
//
// The ported posts reference images at root-absolute paths (`/img/...`, `/blog-assets/...`) that the
// old site served out of `../docs`. This app is an ISOLATED workspace (it must not reach into the
// parent `docs/` tree at runtime or deploy time), and Vite/Cloudflare serve static files from
// `public/`, so we COPY the referenced roots into `public/` here. The copied dirs are gitignored and
// re-synced on `predev`/`prebuild` — same bootstrap pattern as `seed-posts.mjs` is for post text.
//
// This is the near-term home for the frozen legacy assets. New (authored) images will land in R2 once
// authoring + the Cloudflare deploy are wired; at that point this script's target changes, nothing else.
//
// Idempotent: a file is copied only when the destination is missing, a different size, or older than the
// source — so repeat runs (every `pnpm dev`) just stat and skip.

import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, ".."); // rindle-site/
const LEGACY_DOCS = path.resolve(APP_ROOT, "..", "docs"); // ../docs (legacy build output)
const PUBLIC = path.resolve(APP_ROOT, "public");

// The root-absolute asset dirs the seeded posts reference. (`/assets/...` hero SVGs are dangling in the
// legacy site too — no source files exist — so they're intentionally absent here.)
const ROOTS = ["img", "blog-assets"];

/** Recursively yield every file path under `dir` (absolute). */
async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // missing source dir — reported by the caller
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/** True when `dest` is missing / a different size / older than `src` (i.e. needs a (re)copy). */
async function isStale(src, dest) {
  let srcStat, destStat;
  try {
    [srcStat, destStat] = await Promise.all([stat(src), stat(dest)]);
  } catch {
    return true; // dest missing
  }
  return srcStat.size !== destStat.size || srcStat.mtimeMs > destStat.mtimeMs;
}

async function syncRoot(root) {
  const srcDir = path.join(LEGACY_DOCS, root);
  const destDir = path.join(PUBLIC, root);
  let srcOk = false;
  try {
    srcOk = (await stat(srcDir)).isDirectory();
  } catch {
    /* missing */
  }
  if (!srcOk) {
    console.warn(`  ! ${root}: source ${path.relative(APP_ROOT, srcDir)} not found — skipped`);
    return { copied: 0, skipped: 0, bytes: 0 };
  }

  let copied = 0;
  let skipped = 0;
  let bytes = 0;
  for await (const src of walk(srcDir)) {
    const rel = path.relative(srcDir, src);
    const dest = path.join(destDir, rel);
    if (await isStale(src, dest)) {
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(src, dest); // preserves nothing extra; overwrites
      bytes += (await stat(dest)).size;
      copied++;
    } else {
      skipped++;
    }
  }
  const mb = (bytes / 1024 / 1024).toFixed(1);
  console.log(`  ✓ ${root}: ${copied} copied (${mb} MB), ${skipped} up-to-date`);
  return { copied, skipped, bytes };
}

console.log(`sync-assets: ${path.relative(APP_ROOT, LEGACY_DOCS)} → public/`);
let totalCopied = 0;
for (const root of ROOTS) {
  const { copied } = await syncRoot(root);
  totalCopied += copied;
}
console.log(totalCopied === 0 ? "sync-assets: everything up-to-date." : "sync-assets: done.");
