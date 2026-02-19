import { visit } from 'unist-util-visit';
import { readFile } from 'node:fs/promises';

let cachedMemes = null;
async function loadMemeCache() {
  if (cachedMemes) return cachedMemes;
  try {
    cachedMemes = JSON.parse(await readFile('.meme-cache.json', 'utf-8'));
  } catch {
    cachedMemes = {};
  }
  return cachedMemes;
}

export default function rehypeSocialPreview() {
  return async (tree, file) => {
    const matter = file.data.matter || {};

    // 1. Find image: frontmatter first, then first <img> in tree
    let image = matter.image || null;
    if (!image) {
      visit(tree, 'element', (node) => {
        if (!image && node.tagName === 'img' && node.properties?.src) {
          image = node.properties.src;
        }
      });
    }

    // 2. Make absolute
    if (image && !image.startsWith('http')) {
      image = 'https://tantaman.com' + (image.startsWith('/') ? '' : '/') + image;
    }

    // 3. Look up meme thesis
    const cache = await loadMemeCache();
    const thesis = matter.title ? cache[matter.title] : null;

    // 4. Write to file.data.meta
    if (!file.data.meta) file.data.meta = {};
    if (image) file.data.meta.image = { url: image };
    if (thesis) file.data.meta.description = thesis;
  };
}
