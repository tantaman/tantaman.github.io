import type { Post, PostListResponse, PostFrontmatter } from './types';

const BASE = '/api/posts';
const API_BASE = '/api';

function headers(secret: string): HeadersInit {
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

export async function getPosts(
  secret: string,
  status?: string,
): Promise<PostListResponse> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  params.set('limit', '200');
  const res = await fetch(`${BASE}/?${params}`, {
    headers: headers(secret),
  });
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
  return res.json();
}

export async function getPost(secret: string, id: number): Promise<Post> {
  const res = await fetch(`${BASE}/${id}`, {
    headers: headers(secret),
  });
  if (!res.ok) throw new Error(`Failed to fetch post: ${res.status}`);
  return res.json();
}

export async function createPost(
  secret: string,
  data: {
    title: string;
    slug: string;
    body?: string;
    frontmatter?: PostFrontmatter;
  },
): Promise<Post> {
  const res = await fetch(`${BASE}/`, {
    method: 'POST',
    headers: headers(secret),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create post: ${res.status} ${text}`);
  }
  return res.json();
}

export async function updatePost(
  secret: string,
  id: number,
  data: {
    title?: string;
    slug?: string;
    body?: string;
    frontmatter?: PostFrontmatter;
    status?: 'draft' | 'published';
  },
): Promise<Post> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: headers(secret),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update post: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deletePost(
  secret: string,
  id: number,
): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: headers(secret),
  });
  if (!res.ok) throw new Error(`Failed to delete post: ${res.status}`);
}

// --- Wikilink typeahead ---

export type TypeaheadKindLetter = 'd' | 't' | 'p' | 'f' | 'b';

export interface TypeaheadResult {
  id: string;
  title: string;
  snippet?: string;
}

export async function typeahead(
  kind: TypeaheadKindLetter,
  query: string,
  signal: AbortSignal,
  secret?: string | null,
): Promise<TypeaheadResult[]> {
  const params = new URLSearchParams({ kind, q: query, limit: '10' });
  const res = await fetch(`${API_BASE}/typeahead?${params}`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results: TypeaheadResult[] };
  return data.results || [];
}

export async function createThought(
  secret: string,
  body: string,
): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/thoughts`, {
    method: 'POST',
    headers: headers(secret),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Create thought failed: ${res.status} ${text}`);
  }
  return res.json();
}
