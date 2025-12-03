import type { SignalBreakdown, RelationshipConfig, EdgeType } from './types.js';

export interface ScoringResult {
  score: number;
  edgeType: EdgeType;
  signals: SignalBreakdown[];
}

/**
 * Combine multiple signal contributions into a final relationship score
 */
export function computeCombinedScore(
  contributions: SignalBreakdown[],
  config: RelationshipConfig
): ScoringResult {
  // Filter to signals with non-zero scores
  const activeContributions = contributions.filter((c) => c.score > 0);

  if (activeContributions.length === 0) {
    return {
      score: 0,
      edgeType: 'inferred',
      signals: contributions,
    };
  }

  // Weighted sum
  const totalWeight = activeContributions.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = activeContributions.reduce(
    (sum, c) => sum + c.score * c.weight,
    0
  );

  let score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Multi-signal agreement bonus
  // More signals agreeing = higher confidence
  const multiSignalBonus = config.scoring.multiSignalBonus || 0.05;
  const agreementBonus = Math.min(
    activeContributions.length * multiSignalBonus,
    0.15
  );
  score = Math.min(score + agreementBonus, 1.0);

  // Determine edge type based on strongest signal
  const edgeType = determineEdgeType(activeContributions);

  return {
    score,
    edgeType,
    signals: contributions,
  };
}

/**
 * Determine the edge type based on which signals contributed most
 */
function determineEdgeType(contributions: SignalBreakdown[]): EdgeType {
  // Check for explicit links (wiki-links)
  const wikilinkSignal = contributions.find((c) => c.name === 'wikilink');
  if (wikilinkSignal && wikilinkSignal.score > 0) {
    return 'explicit';
  }

  // Check for semantic similarity
  const semanticSignal = contributions.find((c) => c.name === 'semantic');
  if (semanticSignal && semanticSignal.score > 0.3) {
    return 'semantic';
  }

  // Check for text similarity
  const textSignal = contributions.find((c) => c.name === 'text');
  if (textSignal && textSignal.score > 0.3) {
    return 'semantic'; // Treat strong text similarity as semantic
  }

  // Everything else is inferred
  return 'inferred';
}

/**
 * Check if a score passes the minimum threshold
 */
export function passesThreshold(
  score: number,
  config: RelationshipConfig
): boolean {
  return score >= config.scoring.minThreshold;
}

/**
 * Get top N related posts for a given node
 */
export function getTopRelated(
  nodeId: string,
  allScores: Map<string, ScoringResult>,
  config: RelationshipConfig
): Array<{ id: string; score: number; type: EdgeType }> {
  return [...allScores.entries()]
    .filter(([id, result]) => id !== nodeId && passesThreshold(result.score, config))
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, config.scoring.maxRelated)
    .map(([id, result]) => ({
      id,
      score: result.score,
      type: result.edgeType,
    }));
}
