#!/usr/bin/env node

import { collections } from '../collections.js';
import { build } from '../index.js';

const args = process.argv.slice(2);
const forceRebuild = args.includes('--force');

await Promise.all(collections.map((collection) => build(collection, forceRebuild)));

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
