import { describe, test, expect } from 'vitest';
import { cosineSimilarity } from './mcp';

describe('cosineSimilarity', () => {
  test('identical vectors → 1.0', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
  });

  test('orthogonal vectors → 0.0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  test('opposite vectors → -1.0', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });

  test('known angle (45°) → ~0.7071', () => {
    expect(cosineSimilarity([1, 0], [1, 1])).toBeCloseTo(Math.SQRT1_2);
  });

  test('scaled vectors → 1.0 (magnitude invariant)', () => {
    expect(cosineSimilarity([2, 0], [4, 0])).toBeCloseTo(1.0);
  });
});
