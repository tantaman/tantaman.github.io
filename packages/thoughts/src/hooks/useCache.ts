import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { getThread, getRelated, getTags, getTasks, getQuestions, getEvents, getLocations, getMovies, getBooks, getAlbums, getBookmarks, getAmplifications, searchThoughts, searchAll, getFramings, getFraming, getPostsManifest, getMedia, getThoughtGraph, getDocuments, getDocument } from '../api';
import type { MediaItem } from '../types';

export function useThread(id: number, secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  return useSWR(`thread-${id}-${authKey}`, () => getThread(id, secret || undefined));
}

export function useRelated(id: number, secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  return useSWR(`related-${id}-${authKey}`, () => getRelated(id, secret || undefined));
}

export function useTags(selectedTags: string[], secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  const key = `tags-${selectedTags.join(',')}-${authKey}`;
  return useSWR(key, () => getTags(selectedTags.length > 0 ? selectedTags : undefined, secret || undefined));
}

export function useTasks(status: 'incomplete' | 'deprioritized' | 'all', tags: string[]) {
  const key = `tasks-${status}-${tags.join(',')}`;
  return useSWR(key, () => getTasks(status, tags.length > 0 ? tags : undefined));
}

export function useQuestions(status: 'open' | 'answered' | 'all', tags: string[]) {
  const key = `questions-${status}-${tags.join(',')}`;
  return useSWR(key, () => getQuestions(status, tags.length > 0 ? tags : undefined));
}

export function useSearch(query: string, secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  const key = query ? `search-all-${query}-${authKey}` : null;
  return useSWR(key, () => searchAll(query, secret || undefined));
}

export function useThoughtSearch(query: string, secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  const key = query ? `search-${query}-${authKey}` : null;
  return useSWR(key, () => searchThoughts(query, secret || undefined));
}

export function useEvents(year: number, month: number) {
  const from = Date.UTC(year, month, 1) / 1000;
  const to = Date.UTC(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 1) / 1000;
  return useSWR(`events-${year}-${month}`, () => getEvents(from, to));
}

export function useLocations() {
  return useSWR('locations', () => getLocations());
}

export function useMovies() {
  return useSWR('movies', () => getMovies());
}

export function useBooks() {
  return useSWR('books', () => getBooks());
}

export function useAlbums() {
  return useSWR('albums', () => getAlbums());
}

export function useBookmarks() {
  return useSWR('bookmarks', () => getBookmarks());
}

export function useAmplifications(source?: string) {
  const key = source ? `amplifications-${source}` : 'amplifications';
  return useSWR(key, () => getAmplifications(source));
}

export function useFramings() {
  return useSWR('framings', getFramings);
}

export function useFraming(id: number) {
  return useSWR(`framing-${id}`, () => getFraming(id));
}

export function useDocuments(secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  return useSWR(`documents-${authKey}`, () => getDocuments(secret || undefined));
}

export function useDocument(id: number, secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  return useSWR(`document-${id}-${authKey}`, () => getDocument(id, secret || undefined));
}

export function useThoughtGraph(secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  return useSWR(`thought-graph-${authKey}`, () => getThoughtGraph(secret || undefined));
}

export function usePostsManifest() {
  return useSWR('posts-manifest', getPostsManifest);
}

const MEDIA_LIMIT = 50;

interface MediaPage {
  media: MediaItem[];
  meta: { hasMore: boolean };
}

export function useMedia(secret?: string | null) {
  const authKey = secret ? 'a' : 'p';
  const { data, size, setSize } = useSWRInfinite<MediaPage>(
    (pageIndex) => `media-${authKey}-page-${pageIndex}`,
    (key) => {
      const pageIndex = parseInt(key.split('-page-')[1], 10);
      return getMedia(pageIndex * MEDIA_LIMIT, MEDIA_LIMIT, secret || undefined);
    },
    { persistSize: true },
  );

  const media = data ? data.flatMap((page) => page.media) : [];
  const hasMore = data ? data[data.length - 1]?.meta.hasMore ?? false : false;
  const loading = !data;
  const loadMore = () => setSize(size + 1);

  return { media, hasMore, loading, loadMore };
}
