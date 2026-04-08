import type { List, ListItem } from './types';

const API = 'https://tantaman.com/api/lists';

function authHeaders(secret: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

function authOnly(secret: string): Record<string, string> {
  return { Authorization: `Bearer ${secret}` };
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

// --- Auth-gated (dashboard) ---

export async function getLists(secret: string): Promise<List[]> {
  const res = await fetch(API, { headers: authOnly(secret) });
  if (!res.ok) throw new Error('Failed to fetch lists');
  const data = await res.json();
  return data.lists;
}

export async function createList(name: string, secret: string): Promise<List> {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(secret),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
}

export async function deleteList(uuid: string, secret: string): Promise<void> {
  const res = await fetch(`${API}/${uuid}`, {
    method: 'DELETE',
    headers: authOnly(secret),
  });
  if (!res.ok) throw new Error('Failed to delete list');
}

// --- Public (UUID is the capability) ---

export async function getList(uuid: string): Promise<{ list: List; items: ListItem[] }> {
  const res = await fetch(`${API}/${uuid}`);
  if (!res.ok) throw new Error('Failed to fetch list');
  return res.json();
}

export async function updateList(uuid: string, name: string): Promise<List> {
  const res = await fetch(`${API}/${uuid}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to update list');
  return res.json();
}

export async function createItem(uuid: string, text: string): Promise<ListItem> {
  const res = await fetch(`${API}/${uuid}/items`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to create item');
  return res.json();
}

export async function updateItem(
  uuid: string,
  itemId: number,
  updates: { text?: string; completed?: boolean; position?: number },
): Promise<ListItem> {
  const res = await fetch(`${API}/${uuid}/items/${itemId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update item');
  return res.json();
}

export async function deleteItem(uuid: string, itemId: number): Promise<void> {
  const res = await fetch(`${API}/${uuid}/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete item');
}
