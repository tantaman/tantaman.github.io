import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';
import type { SignalExtractor } from './base.js';
import { collectionAffinity } from '../config.js';

interface CollectionData {
  collection: string;
}

/**
 * Collection affinity signal
 *
 * Some collection pairs naturally relate more than others.
 * E.g., blog posts and notes often reference each other.
 */
export const collectionSignal: SignalExtractor<CollectionData> = {
  name: 'collection',
  isSymmetric: true,

  extract(node: ContentNode): CollectionData {
    return { collection: node.collection };
  },

  computeScore(
    _nodeA: ContentNode,
    _nodeB: ContentNode,
    dataA: CollectionData,
    dataB: CollectionData,
    config: SignalConfig
  ): SignalBreakdown {
    // Look up affinity in the matrix
    const affinity =
      collectionAffinity[dataA.collection]?.[dataB.collection] ??
      collectionAffinity[dataB.collection]?.[dataA.collection] ??
      0.2;

    return {
      name: 'collection',
      score: affinity,
      weight: config.weight,
      details: {
        collections: [dataA.collection || 'blog', dataB.collection || 'blog'],
        sameCollection: dataA.collection === dataB.collection,
      },
    };
  },
};

export default collectionSignal;
