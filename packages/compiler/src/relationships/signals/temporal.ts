import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';
import type { SignalExtractor } from './base.js';

interface TemporalData {
  date: Date | null;
  timestamp: number;
}

/**
 * Temporal proximity signal
 *
 * Posts published close together in time may be thematically related.
 * Uses exponential decay based on days between posts.
 */
export const temporalSignal: SignalExtractor<TemporalData> = {
  name: 'temporal',
  isSymmetric: true,

  extract(node: ContentNode): TemporalData {
    let dateStr = node.date;

    // Try to extract date from filename if not in frontmatter
    if (!dateStr) {
      const match = node.id.match(/^(\d{4}-\d{2}-\d{2})/);
      dateStr = match ? match[1] : null;
    }

    const date = dateStr ? new Date(dateStr) : null;

    return {
      date,
      timestamp: date ? date.getTime() : 0,
    };
  },

  computeScore(
    _nodeA: ContentNode,
    _nodeB: ContentNode,
    dataA: TemporalData,
    dataB: TemporalData,
    config: SignalConfig
  ): SignalBreakdown {
    // If either has no date, return 0
    if (!dataA.date || !dataB.date) {
      return {
        name: 'temporal',
        score: 0,
        weight: config.weight,
        details: { reason: 'missing_date' },
      };
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.abs(dataA.timestamp - dataB.timestamp) / msPerDay;

    // Skip if beyond max days
    const maxDays = (config.options?.maxDays as number) || 365;
    if (daysDiff > maxDays) {
      return {
        name: 'temporal',
        score: 0,
        weight: config.weight,
        details: { daysDiff, reason: 'beyond_max' },
      };
    }

    // Exponential decay: score = exp(-decayRate * daysDiff)
    // With decayRate=0.03:
    //   0 days -> 1.0
    //   7 days -> 0.81
    //   23 days -> 0.50
    //   100 days -> 0.05
    const decayRate = (config.options?.decayRate as number) || 0.03;
    const score = Math.exp(-decayRate * daysDiff);

    return {
      name: 'temporal',
      score,
      weight: config.weight,
      details: { daysDiff },
    };
  },
};

export default temporalSignal;
