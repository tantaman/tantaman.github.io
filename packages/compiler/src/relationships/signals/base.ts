import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';

/**
 * Base interface for signal extractors
 *
 * Each signal extractor:
 * 1. Extracts relevant data from a content node (extract)
 * 2. Computes a similarity score between two nodes (computeScore)
 */
export interface SignalExtractor<TData = unknown> {
  name: string;

  /**
   * Extract signal-specific data from a content node.
   * This is called once per node and cached for pairwise comparisons.
   */
  extract(node: ContentNode, corpus: ContentNode[]): TData;

  /**
   * Compute similarity score between two nodes.
   * @returns Score between 0-1, higher = more related
   */
  computeScore(
    nodeA: ContentNode,
    nodeB: ContentNode,
    dataA: TData,
    dataB: TData,
    config: SignalConfig,
    globalData?: unknown
  ): SignalBreakdown;

  /**
   * Whether this relationship is symmetric (A->B same as B->A)
   */
  isSymmetric: boolean;

  /**
   * Optional: compute global data across corpus (e.g., IDF scores)
   */
  computeGlobalData?(corpus: ContentNode[]): unknown;
}
