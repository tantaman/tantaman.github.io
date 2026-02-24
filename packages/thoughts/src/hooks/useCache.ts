import useSWR from 'swr';
import { getThread, getTags, getTasks, getEvents, searchThoughts, getFramings, getFraming, getPostsManifest } from '../api';

export function useThread(id: number) {
  return useSWR(`thread-${id}`, () => getThread(id));
}

export function useTags(selectedTags: string[]) {
  const key = `tags-${selectedTags.join(',')}`;
  return useSWR(key, () => getTags(selectedTags.length > 0 ? selectedTags : undefined));
}

export function useTasks(status: 'incomplete' | 'deprioritized' | 'all', tags: string[]) {
  const key = `tasks-${status}-${tags.join(',')}`;
  return useSWR(key, () => getTasks(status, tags.length > 0 ? tags : undefined));
}

export function useSearch(query: string) {
  const key = query ? `search-${query}` : null;
  return useSWR(key, () => searchThoughts(query));
}

export function useEvents(year: number, month: number) {
  const from = Date.UTC(year, month, 1) / 1000;
  const to = Date.UTC(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 1) / 1000;
  return useSWR(`events-${year}-${month}`, () => getEvents(from, to));
}

export function useFramings() {
  return useSWR('framings', getFramings);
}

export function useFraming(id: number) {
  return useSWR(`framing-${id}`, () => getFraming(id));
}

export function usePostsManifest() {
  return useSWR('posts-manifest', getPostsManifest);
}
