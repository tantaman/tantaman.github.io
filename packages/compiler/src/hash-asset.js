import fs from 'fs';
import { createHash } from 'crypto';
import path from 'path';

const docsDir = path.join(process.cwd(), 'docs');
const assetHashCache = new Map();

export function hashAsset(urlPath) {
  if (!urlPath.startsWith('/')) return urlPath;
  if (assetHashCache.has(urlPath)) return assetHashCache.get(urlPath);
  try {
    const content = fs.readFileSync(path.join(docsDir, urlPath));
    const hash = createHash('md5').update(content).digest('hex').slice(0, 8);
    const result = `${urlPath}?v=${hash}`;
    assetHashCache.set(urlPath, result);
    return result;
  } catch {
    return urlPath;
  }
}
