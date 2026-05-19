const KEY = 'thought-secret';

export function getSecret(): string | null {
  return localStorage.getItem(KEY);
}

export function setSecret(s: string | null): void {
  if (s) {
    localStorage.setItem(KEY, s);
  } else {
    localStorage.removeItem(KEY);
  }
}

export function authHeaders(secret?: string | null): Record<string, string> | undefined {
  return secret ? { Authorization: `Bearer ${secret}` } : undefined;
}
