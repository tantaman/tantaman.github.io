import type { Thought, Tag, Task, Event, SearchResult } from './types';

const API = 'https://tantamanlands.tantaman.workers.dev';

interface ThoughtsResponse {
  thoughts: Thought[];
  meta: { hasMore: boolean };
}

interface ThreadResponse {
  parent: Thought;
  replies: Thought[];
}

interface TagsResponse {
  tags: Tag[];
}

export function searchThoughts(
  query: string,
): Promise<{ thoughts: SearchResult[] }> {
  return fetch(`${API}/thoughts/search?q=${encodeURIComponent(query)}`).then((r) => r.json());
}

export function getThoughts(
  offset: number,
  limit: number,
  tags?: string[],
): Promise<ThoughtsResponse> {
  let url = `${API}/thoughts?limit=${limit}&offset=${offset}`;
  if (tags && tags.length > 0) url += `&tags=${tags.map(encodeURIComponent).join(',')}`;
  return fetch(url).then((r) => r.json());
}

export function getThread(id: number): Promise<ThreadResponse> {
  return fetch(`${API}/thoughts/${id}/replies`).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export function getTags(tags?: string[]): Promise<TagsResponse> {
  let url = `${API}/thoughts/tags`;
  if (tags && tags.length > 0) url += `?tags=${tags.map(encodeURIComponent).join(',')}`;
  return fetch(url).then((r) => r.json());
}

export async function postThought(
  body: string,
  secret: string,
  parentId?: number,
  files?: File[],
): Promise<Thought> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
  };

  let reqBody: FormData | string;

  if (files && files.length > 0) {
    const fd = new FormData();
    fd.append('body', body);
    if (parentId != null) fd.append('parent_id', String(parentId));
    for (const file of files) fd.append('file', file);
    reqBody = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    const payload: Record<string, unknown> = { body };
    if (parentId != null) payload.parent_id = parentId;
    reqBody = JSON.stringify(payload);
  }

  const r = await fetch(`${API}/thoughts`, {
    method: 'POST',
    headers,
    body: reqBody,
  });

  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function deleteThought(
  id: number,
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/thoughts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
}

export function getTasks(
  status: 'incomplete' | 'all' = 'incomplete',
  tags?: string[],
): Promise<{ tasks: Task[] }> {
  let url = `${API}/tasks?status=${status}`;
  if (tags && tags.length > 0) url += `&tags=${tags.map(encodeURIComponent).join(',')}`;
  return fetch(url).then((r) => r.json());
}

export async function patchTask(
  id: number,
  completed: boolean,
  secret: string,
): Promise<Task> {
  const r = await fetch(`${API}/tasks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ completed }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export function getEvents(
  from?: number,
  to?: number,
): Promise<{ events: Event[] }> {
  let url = `${API}/events`;
  const params: string[] = [];
  if (from != null) params.push(`from=${from}`);
  if (to != null) params.push(`to=${to}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return fetch(url).then((r) => r.json());
}

export function attachmentUrl(key: string): string {
  return `${API}/attachments/${key}`;
}
