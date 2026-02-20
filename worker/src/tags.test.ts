import { describe, test, expect } from 'vitest';
import { extractTags } from './tags';

describe('extractTags', () => {
  test('single tag', () => {
    expect(extractTags('hello #world')).toEqual(['world']);
  });

  test('multiple tags', () => {
    const tags = extractTags('#foo and #bar');
    expect(tags).toContain('foo');
    expect(tags).toContain('bar');
    expect(tags).toHaveLength(2);
  });

  test('deduplication', () => {
    expect(extractTags('#foo #foo')).toEqual(['foo']);
  });

  test('case normalization', () => {
    expect(extractTags('#Foo')).toEqual(['foo']);
  });

  test('tag at start of line', () => {
    expect(extractTags('#tag at start')).toEqual(['tag']);
  });

  test('rejects tags starting with digit', () => {
    expect(extractTags('#123 not a tag')).toEqual([]);
  });

  test('hyphens and underscores allowed', () => {
    const tags = extractTags('#my-tag #my_tag');
    expect(tags).toContain('my-tag');
    expect(tags).toContain('my_tag');
    expect(tags).toHaveLength(2);
  });

  test('empty string returns empty array', () => {
    expect(extractTags('')).toEqual([]);
  });
});
