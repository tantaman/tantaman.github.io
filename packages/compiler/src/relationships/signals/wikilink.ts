import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';
import type { SignalExtractor } from './base.js';

interface WikiLinkData {
  outboundLinks: Set<string>;
  normalizedId: string;
}

/**
 * Wiki-link signal extractor
 *
 * Detects explicit [[link]] references between documents.
 * Strongest signal since it represents intentional connections.
 */
export const wikilinkSignal: SignalExtractor<WikiLinkData> = {
  name: 'wikilink',
  isSymmetric: false,

  extract(node: ContentNode): WikiLinkData {
    const outboundLinks = new Set<string>();

    // Parse wiki-links from body
    // Matches [[target]] or [[target|display]]
    const wikiLinkPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;
    while ((match = wikiLinkPattern.exec(node.body)) !== null) {
      const target = match[1].trim();
      outboundLinks.add(normalizeTarget(target));
    }

    // Also include pre-parsed wikiLinks from node if available
    for (const link of node.wikiLinks) {
      outboundLinks.add(normalizeTarget(link));
    }

    return {
      outboundLinks,
      normalizedId: normalizeTarget(node.id),
    };
  },

  computeScore(
    _nodeA: ContentNode,
    _nodeB: ContentNode,
    dataA: WikiLinkData,
    dataB: WikiLinkData,
    config: SignalConfig
  ): SignalBreakdown {
    // Check if A links to B
    const aLinksToB = dataA.outboundLinks.has(dataB.normalizedId);
    // Check if B links to A
    const bLinksToA = dataB.outboundLinks.has(dataA.normalizedId);

    let score = 0;
    if (aLinksToB && bLinksToA) {
      // Bidirectional link is strongest
      score = 1.0;
    } else if (aLinksToB || bLinksToA) {
      // Unidirectional still strong
      score = 0.7;
    }

    return {
      name: 'wikilink',
      score,
      weight: config.weight,
      details: { aLinksToB, bLinksToA },
    };
  },
};

/**
 * Normalize wiki-link target for matching
 */
function normalizeTarget(target: string): string {
  return target
    .toLowerCase()
    .replace(/\.(md|mdx)$/, '')
    .replace(/ /g, '-')
    .replace(/^(notes\/|bookmarks\/|the-mirror-room\/|chats\/)/, '');
}

export default wikilinkSignal;
