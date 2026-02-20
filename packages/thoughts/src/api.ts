import type { Thought, Tag } from './types';

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

export function getThoughts(
  offset: number,
  limit: number,
  tag?: string,
): Promise<ThoughtsResponse> {
  let url = `${API}/thoughts?limit=${limit}&offset=${offset}`;
  if (tag) url += `&tag=${encodeURIComponent(tag)}`;
  return fetch(url).then((r) => r.json());
}

export function getThread(id: number): Promise<ThreadResponse> {
  return fetch(`${API}/thoughts/${id}/replies`).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export function getTags(): Promise<TagsResponse> {
  return fetch(`${API}/thoughts/tags`).then((r) => r.json());
}

export async function postThought(
  body: string,
  secret: string,
  parentId?: number,
  files?: FileList | null,
): Promise<Thought> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
  };

  let reqBody: FormData | string;

  if (files && files.length > 0) {
    const fd = new FormData();
    fd.append('body', body);
    if (parentId != null) fd.append('parent_id', String(parentId));
    for (let i = 0; i < files.length; i++) fd.append('file', files[i]);
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

export function attachmentUrl(key: string): string {
  return `${API}/attachments/${key}`;
}
