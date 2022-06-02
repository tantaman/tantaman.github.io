#!/usr/bin/env node

import { build } from '../index.js';

await Promise.all([
  build(''), // ideally this would be `blog/` but we have historical links to the site to not break
  build('bookmarks/'),
  build('notes/'),
  // build('pages/'),
  // build('tweets/'),
  // build('crumbs/'),
]);
