import type { Thought, Tag, Task, Event, SearchResult, Framing, FramingDetail, FramingPlacement, FramingEdge } from './types';

const API = 'https://tantaman.com/api';

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

// --- Framings API ---

export function getFramings(): Promise<{ framings: Framing[] }> {
  return fetch(`${API}/framings`).then((r) => r.json());
}

export function getFraming(id: number): Promise<FramingDetail> {
  return fetch(`${API}/framings/${id}`).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export async function createFraming(
  name: string,
  secret: string,
  description?: string,
): Promise<Framing> {
  const r = await fetch(`${API}/framings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ name, description }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function deleteFraming(
  id: number,
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/framings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
}

export async function addThoughtToFraming(
  framingId: number,
  thoughtId: number,
  x: number,
  y: number,
  secret: string,
): Promise<FramingPlacement> {
  const r = await fetch(`${API}/framings/${framingId}/thoughts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ thought_id: thoughtId, x, y }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function updateThoughtPlacement(
  framingId: number,
  thoughtId: number,
  pos: { x?: number; y?: number },
  secret: string,
): Promise<FramingPlacement> {
  const r = await fetch(`${API}/framings/${framingId}/thoughts/${thoughtId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(pos),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function removeThoughtFromFraming(
  framingId: number,
  thoughtId: number,
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/framings/${framingId}/thoughts/${thoughtId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Remove failed');
}

export async function batchUpdatePlacements(
  framingId: number,
  thoughts: { thought_id: number; x: number; y: number }[],
  secret: string,
): Promise<{ updated: number }> {
  const r = await fetch(`${API}/framings/${framingId}/batch`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ thoughts }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function createFramingEdge(
  framingId: number,
  sourceThoughtId: number,
  targetThoughtId: number,
  secret: string,
  label?: string,
): Promise<FramingEdge> {
  const r = await fetch(`${API}/framings/${framingId}/edges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ source_thought_id: sourceThoughtId, target_thought_id: targetThoughtId, label }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function updateFramingEdge(
  framingId: number,
  edgeId: number,
  label: string,
  secret: string,
): Promise<FramingEdge> {
  const r = await fetch(`${API}/framings/${framingId}/edges/${edgeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ label }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function deleteFramingEdge(
  framingId: number,
  edgeId: number,
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/framings/${framingId}/edges/${edgeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
}
