export interface Attachment {
  key: string;
  name: string;
  type: string;
}

export interface Thought {
  id: number;
  body: string;
  timestamp: number;
  parent_id: number | null;
  version_of: number | null;
  superseded_by: number | null;
  reply_count: number;
  attachments: Attachment[];
  color: string | null;
  private: boolean;
}

export interface ThoughtVersion {
  id: number;
  timestamp: number;
}

export interface Tag {
  name: string;
  count: number;
}

export interface Task {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  created_at: number;
  completed_at: number | null;
  deprioritized_at: number | null;
}

export interface Event {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  date_text: string;
  date_epoch: number;
  created_at: number;
}

export interface Location {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  resolved_name: string | null;
  created_at: number;
}

export interface Movie {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  poster_url: string | null;
  year: string | null;
  tmdb_id: number | null;
  vote_average: number | null;
  vote_count: number | null;
  reply_count: number;
  created_at: number;
}

export interface Book {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  author: string | null;
  year: string | null;
  ol_key: string | null;
  reply_count: number;
  created_at: number;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string | null;
  thought_count: number;
  created_at: number;
}

export interface SearchResult extends Thought {
  score: number;
}

export interface Framing {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface FramingNodeBase {
  id: number;
  node_type: 'thought' | 'post';
  item_id: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
}

export interface FramingThoughtNode extends FramingNodeBase {
  node_type: 'thought';
  body: string;
  timestamp: number;
  color: string | null;
}

export interface FramingPostNode extends FramingNodeBase {
  node_type: 'post';
  body: null;
  timestamp: null;
  color: null;
}

export type FramingNode = FramingThoughtNode | FramingPostNode;

export interface FramingEdge {
  id: number;
  source_node_id: number;
  target_node_id: number;
  label: string | null;
  source_handle: string | null;
  target_handle: string | null;
}

export interface FramingDetail {
  framing: Framing;
  nodes: FramingNode[];
  edges: FramingEdge[];
}

export interface PostSummary {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  collection: string;
  color: string | null;
}

export interface MediaItem {
  key: string;
  type: string;
  name: string;
  thought_id: number;
  body: string;
  timestamp: number;
  color: string | null;
}

export interface GraphResponse {
  thoughts: Thought[];
  embeddings: Record<string, number[]>;
}

export type Route =
  | { view: 'feed' }
  | { view: 'thread'; id: number }
  | { view: 'tasks' }
  | { view: 'events' }
  | { view: 'framings' }
  | { view: 'framing'; id: number }
  | { view: 'locations' }
  | { view: 'media' }
  | { view: 'movies' }
  | { view: 'books' }
  | { view: 'bookmarks' }
  | { view: 'graph' };
