import type { Item, ItemsResponse, FacetDef, Target, ItemStatus } from './types';
import { authHeaders } from './auth';

const API = '/api/wardrobe';

export function attachmentUrl(key: string): string {
  return `/api/attachments/${key}`;
}

export async function getItems(
  status?: ItemStatus | 'all',
  facets?: Record<string, string>,
  secret?: string | null,
): Promise<ItemsResponse> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  if (facets) {
    for (const [k, v] of Object.entries(facets)) {
      if (v) params.set(`facet.${k}`, v);
    }
  }
  const qs = params.toString();
  const r = await fetch(`${API}/items${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(secret),
  });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  return r.json();
}

export async function getItem(id: number, secret?: string | null): Promise<Item> {
  const r = await fetch(`${API}/items/${id}`, { headers: authHeaders(secret) });
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  return r.json();
}

export async function createItem(
  data: {
    name?: string;
    brand?: string;
    notes?: string;
    facets?: Record<string, string>;
    status?: ItemStatus;
    rating?: number | null;
    price_cents?: number | null;
    links?: { url: string; title?: string; image?: string; price_cents?: number }[];
  },
  files: File[],
  secret: string,
): Promise<Item> {
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  for (const f of files) fd.append('file', f);
  const r = await fetch(`${API}/items`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    body: fd,
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Create failed');
  return r.json();
}

export async function patchItem(
  id: number,
  data: Partial<{
    name: string | null;
    brand: string | null;
    notes: string;
    facets: Record<string, string>;
    status: ItemStatus;
    rating: number | null;
    price_cents: number | null;
    links: { url: string; title?: string; image?: string; price_cents?: number }[];
  }>,
  secret: string,
): Promise<Item> {
  const r = await fetch(`${API}/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(data),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export async function addPhotos(id: number, files: File[], secret: string): Promise<Item> {
  const fd = new FormData();
  for (const f of files) fd.append('file', f);
  const r = await fetch(`${API}/items/${id}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    body: fd,
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Upload failed');
  return r.json();
}

export async function removePhoto(id: number, key: string, secret: string): Promise<Item> {
  const r = await fetch(`${API}/items/${id}/photos/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
  return r.json();
}

export async function deleteItem(id: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
}

export async function getFacets(secret?: string | null): Promise<{ facets: FacetDef[] }> {
  const r = await fetch(`${API}/facets`, { headers: authHeaders(secret) });
  if (!r.ok) throw new Error('Fetch failed');
  return r.json();
}

export async function setFacets(facets: FacetDef[], secret: string): Promise<{ facets: FacetDef[] }> {
  const r = await fetch(`${API}/facets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ facets }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export async function getTargets(secret?: string | null): Promise<{ targets: Target[] }> {
  const r = await fetch(`${API}/targets`, { headers: authHeaders(secret) });
  if (!r.ok) throw new Error('Fetch failed');
  return r.json();
}

export async function setTargets(targets: Target[], secret: string): Promise<{ targets: Target[] }> {
  const r = await fetch(`${API}/targets`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ targets }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}
