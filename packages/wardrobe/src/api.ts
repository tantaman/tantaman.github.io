import type { Item, ItemsResponse, FacetDef, Target, ItemStatus, OutfitSummary, OutfitDetail } from './types';
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

export interface OgResponse {
  url: string;
  title: string | null;
  image: string | null;
  description: string | null;
  site_name: string | null;
  price_cents: number | null;
  price_currency: string | null;
}

export async function fetchOg(url: string): Promise<OgResponse | null> {
  const r = await fetch(`${API}/og?url=${encodeURIComponent(url)}`);
  if (!r.ok) return null;
  return r.json();
}

// Fetch an OG image through the worker proxy and return it as a File so it
// can be uploaded with the rest of the item's photos.
export async function fetchOgImageAsFile(imageUrl: string): Promise<File | null> {
  try {
    const r = await fetch(`${API}/og-image?url=${encodeURIComponent(imageUrl)}`);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob.size === 0 || !blob.type.startsWith('image/')) return null;
    const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
    let baseName = 'og-image';
    try {
      const u = new URL(imageUrl);
      const last = u.pathname.split('/').filter(Boolean).pop();
      if (last) baseName = last.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'og-image';
    } catch {}
    return new File([blob], `${baseName}.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

export async function suggestFacets(itemId: number, secret: string): Promise<{ suggestions: Record<string, string>; raw?: string }> {
  const r = await fetch(`${API}/items/${itemId}/suggest-facets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as { error: string }).error || 'Request failed');
  }
  return r.json();
}

// Stateless variant used by quick-import — suggests facets from a public
// image URL without an item existing yet. Best-effort; returns null on any
// failure so the caller can carry on filling the form.
export async function suggestFacetsFromImage(
  imageUrl: string,
  secret: string,
): Promise<{ suggestions: Record<string, string> } | null> {
  try {
    const r = await fetch(`${API}/suggest-facets-from-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
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

// Outfits

export async function getOutfits(secret?: string | null): Promise<{ outfits: OutfitSummary[] }> {
  const r = await fetch(`${API}/outfits`, { headers: authHeaders(secret) });
  if (!r.ok) throw new Error('Fetch failed');
  return r.json();
}

export async function getOutfit(id: number, secret?: string | null): Promise<OutfitDetail> {
  const r = await fetch(`${API}/outfits/${id}`, { headers: authHeaders(secret) });
  if (!r.ok) throw new Error('Fetch failed');
  return r.json();
}

export async function createOutfit(
  data: { name: string; occasion?: string; notes?: string },
  secret: string,
): Promise<OutfitDetail> {
  const r = await fetch(`${API}/outfits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(data),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Create failed');
  return r.json();
}

export async function patchOutfit(
  id: number,
  data: { name?: string; occasion?: string | null; notes?: string },
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/outfits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(data),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
}

export async function deleteOutfit(id: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/outfits/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
}

export async function addItemToOutfit(outfitId: number, itemId: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/outfits/${outfitId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ item_id: itemId }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Add failed');
}

export async function removeItemFromOutfit(outfitId: number, itemId: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/outfits/${outfitId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Remove failed');
}
