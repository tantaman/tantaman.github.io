const API_BASE = 'https://tantamanlands.tantaman.workers.dev';

export interface Comment {
  id: number;
  post_slug: string;
  author_name: string;
  body: string;
  created_at: number;
  parent_id: number | null;
}

export interface Session {
  session_token: string;
  commenter_id: number;
  name: string;
  email: string;
}

export async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(
    `${API_BASE}/comments?slug=${encodeURIComponent(slug)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.comments;
}

export async function requestCode(
  email: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/comments/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    return { ok: false, error: data.error };
  }
  return { ok: true };
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<Session | { error: string }> {
  const res = await fetch(`${API_BASE}/comments/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || 'Verification failed' };
  return data as Session;
}

export async function checkSession(
  token: string,
): Promise<{ commenter_id: number; email: string; name: string } | null> {
  const res = await fetch(`${API_BASE}/comments/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function postComment(
  slug: string,
  body: string,
  parentId: number | null,
  sessionToken: string,
  hp: string,
): Promise<Comment | null> {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      slug,
      body,
      parent_id: parentId,
      hp,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}
