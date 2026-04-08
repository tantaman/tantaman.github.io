import type { List, ListItem } from './types';

const API = 'https://tantaman.com/api/lists';

function headers(secret: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

function authOnly(secret: string): Record<string, string> {
  return { Authorization: `Bearer ${secret}` };
}

export async function getLists(secret: string): Promise<List[]> {
  const res = await fetch(API, { headers: authOnly(secret) });
  if (!res.ok) throw new Error('Failed to fetch lists');
  const data = await res.json();
  return data.lists;
}

export async function getList(id: number, secret: string): Promise<{ list: List; items: ListItem[] }> {
  const res = await fetch(`${API}/${id}`, { headers: authOnly(secret) });
  if (!res.ok) throw new Error('Failed to fetch list');
  return res.json();
}

export async function createList(name: string, secret: string): Promise<List> {
  const res = await fetch(API, {
    method: 'POST',
    headers: headers(secret),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
}

export async function updateList(id: number, name: string, secret: string): Promise<List> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: headers(secret),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to update list');
  return res.json();
}

export async function deleteList(id: number, secret: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, {
    method: 'DELETE',
    headers: authOnly(secret),
  });
  if (!res.ok) throw new Error('Failed to delete list');
}

export async function createItem(listId: number, text: string, secret: string): Promise<ListItem> {
  const res = await fetch(`${API}/${listId}/items`, {
    method: 'POST',
    headers: headers(secret),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to create item');
  return res.json();
}

export async function updateItem(
  listId: number,
  itemId: number,
  updates: { text?: string; completed?: boolean; position?: number },
  secret: string,
): Promise<ListItem> {
  const res = await fetch(`${API}/${listId}/items/${itemId}`, {
    method: 'PATCH',
    headers: headers(secret),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update item');
  return res.json();
}

export async function deleteItem(listId: number, itemId: number, secret: string): Promise<void> {
  const res = await fetch(`${API}/${listId}/items/${itemId}`, {
    method: 'DELETE',
    headers: authOnly(secret),
  });
  if (!res.ok) throw new Error('Failed to delete item');
}
