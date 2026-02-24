import type { Thought, Tag, Task, Event, SearchResult, Framing, FramingDetail, FramingNode, FramingEdge, PostSummary } from './types';

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
  status: 'incomplete' | 'deprioritized' | 'all' = 'incomplete',
  tags?: string[],
): Promise<{ tasks: Task[] }> {
  let url = `${API}/tasks?status=${status}`;
  if (tags && tags.length > 0) url += `&tags=${tags.map(encodeURIComponent).join(',')}`;
  return fetch(url).then((r) => r.json());
}

export async function patchTask(
  id: number,
  action: { completed?: boolean; deprioritized?: boolean },
  secret: string,
): Promise<Task> {
  const r = await fetch(`${API}/tasks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(action),
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

export async function addNodeToFraming(
  framingId: number,
  nodeType: 'thought' | 'post',
  itemId: string,
  x: number,
  y: number,
  secret: string,
): Promise<{ id: number; framing_id: number; node_type: string; item_id: string; x: number; y: number }> {
  const r = await fetch(`${API}/framings/${framingId}/nodes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ node_type: nodeType, item_id: itemId, x, y }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function removeNodeFromFraming(
  framingId: number,
  nodeId: number,
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/framings/${framingId}/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Remove failed');
}

export async function batchUpdateNodes(
  framingId: number,
  nodes: { node_id: number; x: number; y: number }[],
  secret: string,
): Promise<{ updated: number }> {
  const r = await fetch(`${API}/framings/${framingId}/batch`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ nodes }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  return r.json();
}

export async function createFramingEdge(
  framingId: number,
  sourceNodeId: number,
  targetNodeId: number,
  secret: string,
  label?: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): Promise<FramingEdge> {
  const r = await fetch(`${API}/framings/${framingId}/edges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      label,
      source_handle: sourceHandle ?? null,
      target_handle: targetHandle ?? null,
    }),
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

// --- Posts Manifest ---

let postsManifestCache: PostSummary[] | null = null;

export async function getPostsManifest(): Promise<PostSummary[]> {
  if (postsManifestCache) return postsManifestCache;
  const r = await fetch('/posts-manifest.json');
  const data = await r.json() as PostSummary[];
  postsManifestCache = data;
  return data;
}
