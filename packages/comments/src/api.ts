import type { CommentsResponse, AuthSession, Commenter } from './types';
import { getSessionToken } from './auth';

const BASE = '/api/comments';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function fetchComments(slug: string, visitorId: string): Promise<CommentsResponse> {
  return fetchJSON(`${BASE}/${slug}?visitor_id=${encodeURIComponent(visitorId)}`);
}

export function toggleLike(slug: string, visitorId: string): Promise<{ liked: boolean; like_count: number }> {
  return fetchJSON(`${BASE}/${slug}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitor_id: visitorId }),
  });
}

export function createComment(slug: string, body: string, parentId?: number): Promise<any> {
  return fetchJSON(`${BASE}/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ body, parent_id: parentId }),
  });
}

export function deleteComment(slug: string, commentId: number): Promise<any> {
  return fetchJSON(`${BASE}/${slug}/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export function requestOtp(email: string): Promise<{ sent: boolean }> {
  return fetchJSON(`${BASE}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, code: string, displayName?: string): Promise<AuthSession> {
  return fetchJSON(`${BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, display_name: displayName || undefined }),
  });
}

export function checkSession(): Promise<{ commenter: Commenter }> {
  return fetchJSON(`${BASE}/auth/me`, {
    headers: authHeaders(),
  });
}
