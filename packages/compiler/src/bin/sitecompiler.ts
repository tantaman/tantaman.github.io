#!/usr/bin/env node

import { collections } from '../collections.js';
import { build } from '../index.js';

const args = process.argv.slice(2);
const forceIdx = args.indexOf('--force');
const forceRebuild = forceIdx !== -1;
const forcePath =
  forceRebuild &&
  forceIdx + 1 < args.length &&
  !args[forceIdx + 1].startsWith('--')
    ? args[forceIdx + 1]
    : null;

if (forcePath) {
  // Resolve path to collection + optional filename
  let normalized = forcePath.replace(/^content\/?/, '').replace(/\/$/, '');

  let matchedCollection = '';
  let targetFile: string | null = normalized;

  for (const col of collections) {
    const colName = col.replace(/\/$/, '');
    if (!colName) continue;
    if (normalized === colName) {
      matchedCollection = col;
      targetFile = null; // force entire collection
      break;
    }
    if (normalized.startsWith(colName + '/')) {
      matchedCollection = col;
      targetFile = normalized.slice(colName.length + 1);
      break;
    }
  }

  const forceFiles = targetFile ? new Set([targetFile]) : null;
  // Build targeted collection with force, other collections normally
  await Promise.all(
    collections.map((col) => {
      if (col === matchedCollection) {
        return build(col, !targetFile, forceFiles);
      }
      return build(col, false);
    }),
  );
} else {
  await Promise.all(
    collections.map((collection) => build(collection, forceRebuild)),
  );
}

/*
[
  build(''), // ideally this would be `blog/` but we have historical links to the site to not break
  build('bookmarks/'),
  build('notes/'),
  build('the-mirror-room/'),
  // build('pages/'),
  // build('tweets/'),
  // build('crumbs/'),
]
*/
