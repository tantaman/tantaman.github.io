import type { Commenter } from './types';

const SESSION_KEY = 'comments_session_token';
const COMMENTER_KEY = 'comments_commenter';
const VISITOR_KEY = 'comments_visitor_id';

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(token: string, commenter: Commenter): void {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(COMMENTER_KEY, JSON.stringify(commenter));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(COMMENTER_KEY);
}

export function getCommenter(): Commenter | null {
  const raw = localStorage.getItem(COMMENTER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    id = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}
