import useSWR from 'swr';
import * as api from '../api';
import type { Item, ItemStatus } from '../types';
import { getSecret } from '../auth';

export function useItems(status?: ItemStatus | 'all', facets?: Record<string, string>) {
  const secret = getSecret();
  const key = ['/api/wardrobe/items', status ?? 'all', JSON.stringify(facets ?? {}), secret ? '1' : '0'];
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => api.getItems(status, facets, secret),
  );
  return { items: data?.items ?? [], error, isLoading, mutate };
}

export function useItem(id: number | null) {
  const secret = getSecret();
  const key = id ? ['/api/wardrobe/items', id, secret ? '1' : '0'] : null;
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => (id ? api.getItem(id, secret) : null),
  );
  return { item: data as Item | undefined, error, isLoading, mutate };
}

export function useFacets() {
  const secret = getSecret();
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/wardrobe/facets', secret ? '1' : '0'],
    () => api.getFacets(secret),
  );
  return { facets: data?.facets ?? [], error, isLoading, mutate };
}

export function useTargets() {
  const secret = getSecret();
  const { data, error, isLoading, mutate } = useSWR(
    ['/api/wardrobe/targets', secret ? '1' : '0'],
    () => api.getTargets(secret),
  );
  return { targets: data?.targets ?? [], error, isLoading, mutate };
}
