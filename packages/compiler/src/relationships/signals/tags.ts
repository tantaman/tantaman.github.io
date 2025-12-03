import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';
import type { SignalExtractor } from './base.js';

interface TagData {
  tags: Set<string>;
}

/**
 * Tag similarity signal
 *
 * Computes Jaccard similarity between tag sets.
 * Lower weight since tags are coarse-grained.
 */
export const tagsSignal: SignalExtractor<TagData> = {
  name: 'tags',
  isSymmetric: true,

  extract(node: ContentNode): TagData {
    const tags = new Set(
      node.tags.map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0)
    );
    return { tags };
  },

  computeScore(
    _nodeA: ContentNode,
    _nodeB: ContentNode,
    dataA: TagData,
    dataB: TagData,
    config: SignalConfig
  ): SignalBreakdown {
    if (dataA.tags.size === 0 || dataB.tags.size === 0) {
      return {
        name: 'tags',
        score: 0,
        weight: config.weight,
        details: { sharedTags: [], jaccardScore: 0 },
      };
    }

    // Compute intersection and union
    const intersection = new Set([...dataA.tags].filter((t) => dataB.tags.has(t)));
    const union = new Set([...dataA.tags, ...dataB.tags]);

    // Jaccard similarity
    const jaccardScore = intersection.size / union.size;

    // Small bonus for multiple shared tags (diminishing returns)
    const sharedCount = intersection.size;
    const countBonus = Math.min(sharedCount * 0.05, 0.15);

    const score = Math.min(jaccardScore + countBonus, 1.0);

    return {
      name: 'tags',
      score,
      weight: config.weight,
      details: {
        sharedTags: [...intersection],
        jaccardScore,
        sharedCount,
      },
    };
  },
};

export default tagsSignal;
