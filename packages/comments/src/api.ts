const API_BASE = 'https://tantamanlands.tantaman.workers.dev';

export interface Comment {
  id: number;
  post_slug: string;
  author_name: string;
  body: string;
  created_at: number;
  parent_id: number | null;
}

export async function fetchComments(slug: string): Promise<Comment[]> {
  const res = await fetch(
    `${API_BASE}/comments?slug=${encodeURIComponent(slug)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.comments;
}

export async function postComment(
  slug: string,
  authorName: string,
  body: string,
  parentId: number | null,
  hp: string,
): Promise<Comment | null> {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      author_name: authorName,
      body,
      parent_id: parentId,
      hp,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}
