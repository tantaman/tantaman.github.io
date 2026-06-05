import type { Thought, ThoughtVersion, ThoughtHistoryVersion, Tag, Task, Event, Location, Movie, Book, Album, Bookmark, Amplification, Question, Project, ProjectTask, ProjectComment, ProjectDetail, SearchResult, UnifiedSearchResponse, Framing, FramingDetail, FramingNode, FramingEdge, PostSummary, MediaItem, GraphResponse, RelatedResponse, Ancestor, Document, DocumentSummary, DocumentStatus, DocumentFrontmatter } from './types';

const API = 'https://tantaman.com/api';

function authHeaders(secret?: string): Record<string, string> | undefined {
  return secret ? { Authorization: `Bearer ${secret}` } : undefined;
}

interface ThoughtsResponse {
  thoughts: Thought[];
  meta: { hasMore: boolean };
}

interface ThreadResponse {
  parent: Thought;
  replies: Thought[];
  versions: ThoughtVersion[];
  ancestors?: Ancestor[];
}

interface TagsResponse {
  tags: Tag[];
}

export interface HighlightRow {
  id: number;
  quoted_text: string;
  color: string | null;
}

export function getHighlights(
  source: string,
  secret?: string,
): Promise<{ highlights: HighlightRow[] }> {
  return fetch(`${API}/highlights?source=${encodeURIComponent(source)}`, {
    headers: authHeaders(secret),
  }).then((r) => {
    if (!r.ok) return { highlights: [] };
    return r.json();
  });
}

export function searchThoughts(
  query: string,
  secret?: string,
): Promise<{ thoughts: SearchResult[] }> {
  return fetch(`${API}/thoughts/search?q=${encodeURIComponent(query)}`, { headers: authHeaders(secret) }).then((r) => r.json());
}

export function searchAll(
  query: string,
  secret?: string,
): Promise<UnifiedSearchResponse> {
  return fetch(`${API}/search?q=${encodeURIComponent(query)}`, { headers: authHeaders(secret) }).then((r) => r.json());
}

export function getThoughts(
  offset: number,
  limit: number,
  tags?: string[],
  secret?: string,
  framing?: number,
): Promise<ThoughtsResponse> {
  let url = `${API}/thoughts?limit=${limit}&offset=${offset}`;
  if (tags && tags.length > 0) url += `&tags=${tags.map(encodeURIComponent).join(',')}`;
  if (framing != null) url += `&framing=${framing}`;
  return fetch(url, { headers: authHeaders(secret) }).then((r) => r.json());
}

export function getThread(id: number, secret?: string): Promise<ThreadResponse> {
  return fetch(`${API}/thoughts/${id}/replies`, { headers: authHeaders(secret) }).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export function getRelated(id: number, secret?: string): Promise<RelatedResponse> {
  return fetch(`${API}/thoughts/${id}/related`, { headers: authHeaders(secret) }).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export function getTags(tags?: string[], secret?: string): Promise<TagsResponse> {
  let url = `${API}/thoughts/tags`;
  if (tags && tags.length > 0) url += `?tags=${tags.map(encodeURIComponent).join(',')}`;
  return fetch(url, { headers: authHeaders(secret) }).then((r) => r.json());
}

export async function postThought(
  body: string,
  secret: string,
  parentId?: number,
  files?: File[],
  isPrivate?: boolean,
): Promise<Thought> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
  };

  let reqBody: FormData | string;

  if (files && files.length > 0) {
    const fd = new FormData();
    fd.append('body', body);
    if (parentId != null) fd.append('parent_id', String(parentId));
    if (isPrivate) fd.append('private', 'true');
    for (const file of files) fd.append('file', file);
    reqBody = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    const payload: Record<string, unknown> = { body };
    if (parentId != null) payload.parent_id = parentId;
    if (isPrivate) payload.private = true;
    reqBody = JSON.stringify(payload);
  }

  const r = await fetch(`${API}/thoughts`, {
    method: 'POST',
    headers,
    body: reqBody,
  });

  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Post failed');
  return r.json();
}

// Edit a thought in place (stable id). Body changes create a new version
// server-side and snapshot the prior body into history.
export async function editThought(
  id: number,
  updates: { body?: string; isPrivate?: boolean },
  secret: string,
  files?: File[],
): Promise<Thought> {
  const headers: Record<string, string> = { Authorization: `Bearer ${secret}` };
  let reqBody: FormData | string;

  if (files && files.length > 0) {
    const fd = new FormData();
    if (updates.body !== undefined) fd.append('body', updates.body);
    if (updates.isPrivate !== undefined) fd.append('private', updates.isPrivate ? 'true' : 'false');
    for (const file of files) fd.append('file', file);
    reqBody = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    const payload: Record<string, unknown> = {};
    if (updates.body !== undefined) payload.body = updates.body;
    if (updates.isPrivate !== undefined) payload.private = updates.isPrivate;
    reqBody = JSON.stringify(payload);
  }

  const r = await fetch(`${API}/thoughts/${id}`, { method: 'PATCH', headers, body: reqBody });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Edit failed');
  return r.json();
}

export function getThoughtHistory(
  id: number,
  secret?: string,
): Promise<{ versions: ThoughtHistoryVersion[] }> {
  return fetch(`${API}/thoughts/${id}/history`, { headers: authHeaders(secret) }).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export async function revertThought(
  id: number,
  version: number,
  secret: string,
): Promise<Thought> {
  const r = await fetch(`${API}/thoughts/${id}/revert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ version }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Revert failed');
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
  action: { completed?: boolean; deprioritized?: boolean; title?: string; description?: string | null },
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

export function getQuestions(
  status: 'open' | 'answered' | 'all' = 'open',
  tags?: string[],
): Promise<{ questions: Question[] }> {
  let url = `${API}/questions?status=${status}`;
  if (tags && tags.length > 0) url += `&tags=${tags.map(encodeURIComponent).join(',')}`;
  return fetch(url).then((r) => r.json());
}

export async function patchQuestion(
  id: number,
  action: { answered?: boolean },
  secret: string,
): Promise<Question> {
  const r = await fetch(`${API}/questions/${id}`, {
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

export function getProjects(
  status: 'active' | 'draft' | 'archived' | 'all' = 'active',
): Promise<{ projects: Project[] }> {
  return fetch(`${API}/projects?status=${status}`).then((r) => r.json());
}

export function getProject(id: number): Promise<ProjectDetail> {
  return fetch(`${API}/projects/${id}`).then((r) => r.json());
}

export async function createProject(
  title: string,
  secret: string,
  description?: string,
): Promise<Project> {
  const r = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ title, description }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to create project');
  return r.json();
}

export async function patchProject(
  id: number,
  updates: { title?: string; description?: string | null; status?: 'active' | 'archived'; archived?: boolean },
  secret: string,
): Promise<Project> {
  const r = await fetch(`${API}/projects/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(updates),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

// Promote a draft project to active (adopts captured tasks in place).
export async function convertProject(id: number, secret: string): Promise<Project> {
  const r = await fetch(`${API}/projects/${id}/convert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to convert project');
  return r.json();
}

// Add a task directly to a project — no thought created.
export async function createProjectTask(
  projectId: number,
  title: string,
  secret: string,
  description?: string,
): Promise<ProjectTask> {
  const r = await fetch(`${API}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ title, description }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to add task');
  return r.json();
}

// Persist explicit task ordering for a project. `ids` is the full desired order.
export async function reorderProjectTasks(
  projectId: number,
  ids: number[],
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/projects/${projectId}/tasks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ ids }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to reorder tasks');
}

export async function deleteTask(id: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/tasks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to delete task');
}

// Task-to-task dependency: blockerTaskId must complete before taskId.
export async function addTaskBlocker(taskId: number, blockerTaskId: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/tasks/${taskId}/blockers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ blocker_task_id: blockerTaskId }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) {
    const msg = await r.json().then((j: any) => j?.error).catch(() => null);
    throw new Error(msg || 'Failed to add dependency');
  }
}

export async function removeTaskBlocker(taskId: number, blockerTaskId: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/tasks/${taskId}/blockers/${blockerTaskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to remove dependency');
}

// ── Project comments (the hub conversation thread) ───────────────────────
export async function createProjectComment(
  projectId: number,
  body: string,
  secret: string,
  parentId?: number | null,
): Promise<ProjectComment> {
  const r = await fetch(`${API}/projects/${projectId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ body, parent_id: parentId ?? null }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to add comment');
  return r.json();
}

export async function patchProjectComment(
  projectId: number,
  commentId: number,
  body: string,
  secret: string,
): Promise<ProjectComment> {
  const r = await fetch(`${API}/projects/${projectId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ body }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to edit comment');
  return r.json();
}

export async function deleteProjectComment(
  projectId: number,
  commentId: number,
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/projects/${projectId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Failed to delete comment');
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

export function getLocations(
  thoughtId?: number,
): Promise<{ locations: Location[] }> {
  let url = `${API}/locations`;
  if (thoughtId != null) url += `?thought_id=${thoughtId}`;
  return fetch(url).then((r) => r.json());
}

export async function geocodeLocation(
  id: number,
  secret: string,
): Promise<Location> {
  const r = await fetch(`${API}/locations/${id}/geocode`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Geocode failed');
  return r.json();
}

export async function patchLocation(
  id: number,
  body: { title: string },
  secret: string,
): Promise<Location> {
  const r = await fetch(`${API}/locations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export function getMovies(
  thoughtId?: number,
): Promise<{ movies: Movie[] }> {
  let url = `${API}/movies`;
  if (thoughtId != null) url += `?thought_id=${thoughtId}`;
  return fetch(url).then((r) => r.json());
}

export async function patchMovie(
  id: number,
  body: { title?: string; tmdb_id?: number },
  secret: string,
): Promise<Movie> {
  const r = await fetch(`${API}/movies/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export function getBooks(
  thoughtId?: number,
): Promise<{ books: Book[] }> {
  let url = `${API}/books`;
  if (thoughtId != null) url += `?thought_id=${thoughtId}`;
  return fetch(url).then((r) => r.json());
}

export async function patchBook(
  id: number,
  body: { title?: string; ol_key?: string },
  secret: string,
): Promise<Book> {
  const r = await fetch(`${API}/books/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export function getAlbums(
  thoughtId?: number,
): Promise<{ albums: Album[] }> {
  let url = `${API}/albums`;
  if (thoughtId != null) url += `?thought_id=${thoughtId}`;
  return fetch(url).then((r) => r.json());
}

export async function patchAlbum(
  id: number,
  body: { title?: string; itunes_id?: number },
  secret: string,
): Promise<Album> {
  const r = await fetch(`${API}/albums/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export function getBookmarks(): Promise<{ bookmarks: Bookmark[] }> {
  return fetch(`${API}/bookmarks`).then((r) => r.json());
}

export async function patchBookmark(
  id: number,
  secret: string,
): Promise<Bookmark> {
  const r = await fetch(`${API}/bookmarks/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export function getAmplifications(
  source?: string,
): Promise<{ amplifications: Amplification[]; meta: { hasMore: boolean } }> {
  let url = `${API}/amplifications`;
  if (source) url += `?source=${encodeURIComponent(source)}`;
  return fetch(url).then((r) => r.json());
}

export async function createAmplification(
  url: string,
  secret: string,
  note?: string,
  source?: string,
): Promise<Amplification & { duplicate?: boolean }> {
  const r = await fetch(`${API}/amplifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ url, note, source }),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Save failed' }));
    throw new Error(err.error || 'Save failed');
  }
  return r.json();
}

export async function deleteAmplification(id: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/amplifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
}

export async function refetchAmplification(id: number, secret: string): Promise<Amplification> {
  const r = await fetch(`${API}/amplifications/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Refetch failed' }));
    throw new Error(err.error || 'Refetch failed');
  }
  return r.json();
}

export function attachmentUrl(key: string): string {
  return `${API}/attachments/${key}`;
}

export function getMedia(
  offset: number,
  limit: number,
  secret?: string,
): Promise<{ media: MediaItem[]; meta: { hasMore: boolean } }> {
  return fetch(`${API}/media?limit=${limit}&offset=${offset}`, { headers: authHeaders(secret) }).then((r) => r.json());
}

export function getThoughtGraph(secret?: string): Promise<GraphResponse> {
  return fetch(`${API}/thoughts/graph`, { headers: authHeaders(secret) }).then((r) => r.json());
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

export async function updateFraming(
  id: number,
  updates: { name?: string; description?: string },
  secret: string,
): Promise<Framing> {
  const r = await fetch(`${API}/framings/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(updates),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

export async function addNodeToFraming(
  framingId: number,
  nodeType: 'thought' | 'post' | 'document' | 'framing',
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
  kind?: string | null,
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
      kind: kind ?? null,
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

export async function importFraming(
  data: object,
  secret: string,
): Promise<{ id: number }> {
  const r = await fetch(`${API}/framings/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(data),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Import failed');
  return r.json();
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

// --- Documents API ---

export function getDocuments(
  secret?: string,
  status?: DocumentStatus,
): Promise<{ documents: DocumentSummary[] }> {
  const qs = status ? `?status=${status}` : '';
  return fetch(`${API}/documents${qs}`, { headers: authHeaders(secret) }).then((r) => r.json());
}

export function getDocument(id: number, secret?: string): Promise<Document> {
  return fetch(`${API}/documents/${id}`, { headers: authHeaders(secret) }).then((r) => {
    if (!r.ok) throw new Error('not found');
    return r.json();
  });
}

export interface CreateDocumentData {
  title: string;
  body?: string;
  private?: boolean;
  slug?: string;
  status?: DocumentStatus;
  frontmatter?: DocumentFrontmatter;
}

export interface UpdateDocumentData {
  title?: string;
  body?: string;
  private?: boolean;
  slug?: string | null;
  status?: DocumentStatus;
  frontmatter?: DocumentFrontmatter;
}

export async function createDocument(
  data: CreateDocumentData,
  secret: string,
): Promise<Document> {
  const r = await fetch(`${API}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(data),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (r.status === 409) throw new Error('Slug already exists');
  if (!r.ok) throw new Error('Create failed');
  return r.json();
}

export async function updateDocument(
  id: number,
  updates: UpdateDocumentData,
  secret: string,
): Promise<Document> {
  const r = await fetch(`${API}/documents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(updates),
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (r.status === 409) throw new Error('Slug already exists');
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}

// --- Document collab (prosemirror-collab) ---

import type { CollabBootstrap, CollabStepsResponse, CollabStepEntry } from './types';

export class CollabStaleError extends Error {
  constructor(public snapshotVersion: number) {
    super('Local version is older than the snapshot floor — reload required');
  }
}

export class CollabConflictError extends Error {
  constructor(public missed: { head: number; steps: CollabStepEntry[] }) {
    super('Server has newer steps; rebase required');
  }
}

export async function collabBootstrap(
  id: number,
  secret?: string | null,
): Promise<CollabBootstrap> {
  const r = await fetch(`${API}/documents/${id}/collab/bootstrap`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
  if (!r.ok) throw new Error(`Bootstrap failed (${r.status})`);
  return r.json();
}

export async function collabSeed(
  id: number,
  payload: { doc: unknown; body: string; title: string },
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/documents/${id}/collab/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(payload),
  });
  if (r.status === 409) return; // already seeded by another tab — fine
  if (!r.ok) throw new Error(`Seed failed (${r.status})`);
}

export async function collabPullSteps(
  id: number,
  since: number,
  secret: string | null | undefined,
  signal?: AbortSignal,
): Promise<CollabStepsResponse> {
  const r = await fetch(`${API}/documents/${id}/collab/steps?since=${since}`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    signal,
  });
  if (r.status === 410) {
    const body = await r.json().catch(() => ({}));
    throw new CollabStaleError((body as any).snapshotVersion ?? 0);
  }
  if (!r.ok) throw new Error(`Pull failed (${r.status})`);
  return r.json();
}

export async function collabSubmitSteps(
  id: number,
  payload: { baseVersion: number; steps: unknown[]; clientID: number | string },
  secret: string,
): Promise<{ version: number; head: number; shouldSnapshot?: boolean }> {
  const r = await fetch(`${API}/documents/${id}/collab/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(payload),
  });
  if (r.status === 410) {
    const body = await r.json().catch(() => ({}));
    throw new CollabStaleError((body as any).snapshotVersion ?? 0);
  }
  if (r.status === 409) {
    const body = await r.json().catch(() => ({}));
    if ((body as any).error === 'snapshot-required') {
      // Treat like a stale local clone — host must push a snapshot before
      // continuing. Surfacing as conflict-empty triggers a re-bootstrap.
      throw new CollabConflictError({ head: (body as any).head, steps: [] });
    }
    throw new CollabConflictError({ head: (body as any).head, steps: (body as any).steps ?? [] });
  }
  if (r.status === 400) {
    // baseVersion ahead of server head — the local collab plugin is out of
    // sync with the authority. Recover by forcing a re-bootstrap.
    const body = await r.json().catch(() => ({}));
    if ((body as any).error === 'future-version') {
      throw new CollabConflictError({ head: 0, steps: [] });
    }
  }
  if (!r.ok) throw new Error(`Submit failed (${r.status})`);
  return r.json();
}

export async function collabPushSnapshot(
  id: number,
  payload: { version: number; doc: unknown; body: string; title: string },
  secret: string,
): Promise<void> {
  const r = await fetch(`${API}/documents/${id}/collab/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(payload),
  });
  if (!r.ok && r.status !== 200) throw new Error(`Snapshot failed (${r.status})`);
}

export async function deleteDocument(id: number, secret: string): Promise<void> {
  const r = await fetch(`${API}/documents/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (r.status === 401) throw new Error('Unauthorized');
  if (!r.ok) throw new Error('Delete failed');
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
  const r = await fetch(`${API}/typeahead?${params}`, {
    headers: authHeaders(secret ?? undefined),
    signal,
  });
  if (!r.ok) return [];
  const data = (await r.json()) as { results: TypeaheadResult[] };
  return data.results || [];
}
