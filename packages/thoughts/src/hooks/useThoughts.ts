import useSWRInfinite from 'swr/infinite';
import { getThoughts } from '../api';
import type { Thought } from '../types';

const LIMIT = 50;

interface ThoughtsPage {
  thoughts: Thought[];
  meta: { hasMore: boolean };
}

export function useThoughts(tags: string[], secret?: string | null) {
  const tagsKey = tags.join(',');
  const tagsParam = tags.length > 0 ? tags : undefined;
  const authKey = secret ? 'a' : 'p';

  const { data, size, setSize, mutate, isValidating } = useSWRInfinite<ThoughtsPage>(
    (pageIndex) => `thoughts-${tagsKey}-${authKey}-page-${pageIndex}`,
    (key) => {
      const pageIndex = parseInt(key.split('-page-')[1], 10);
      return getThoughts(pageIndex * LIMIT, LIMIT, tagsParam, secret || undefined);
    },
    { persistSize: true },
  );

  const thoughts = data ? data.flatMap((page) => page.thoughts) : [];
  const hasMore = data ? data[data.length - 1]?.meta.hasMore ?? false : false;
  const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined';
  const isLoadingInitial = !data;

  const loadMore = () => setSize(size + 1);

  return { thoughts, hasMore, isLoadingInitial, isLoadingMore: isLoadingMore || false, loadMore, mutate, isValidating };
}
