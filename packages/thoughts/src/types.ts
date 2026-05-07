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
  duplicate_ids: number[];
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
  mention_count: number;
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

export interface Album {
  id: number;
  thought_id: number;
  title: string;
  artist: string | null;
  year: string | null;
  cover_url: string | null;
  itunes_id: number | null;
  genre: string | null;
  description: string | null;
  reply_count: number;
  mention_count: number;
  created_at: number;
}

export interface Question {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  created_at: number;
  answered_at: number | null;
}

export interface Bookmark {
  id: number;
  url: string;
  title: string | null;
  image_url: string | null;
  description: string | null;
  site_name: string | null;
  thought_count: number;
  created_at: number;
}

export interface Amplification {
  id: number;
  url: string;
  source: string;
  note: string | null;
  title: string | null;
  image_url: string | null;
  description: string | null;
  site_name: string | null;
  created_at: number;
}

export interface SearchResult extends Thought {
  score: number;
}

export interface PasteSearchResult {
  id: string;
  title: string | null;
  language: string;
  shared: number;
  created_at: number;
  body_preview: string;
  score: number;
}

export interface AmplificationSearchResult extends Amplification {
  score: number;
}

export interface UnifiedSearchResponse {
  thoughts: SearchResult[];
  pastes: PasteSearchResult[];
  amplifications: AmplificationSearchResult[];
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

export interface Canvas {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface CanvasDetail extends Canvas {
  snapshot: string;
}

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  collection: string;
  color: string | null;
}

export interface Cluster {
  id: number;
  label: string;
  size: number;
}

export interface ClusterItemFacets {
  books: { id: number; title: string }[];
  movies: { id: number; title: string }[];
  events: { id: number; title: string; date_text: string }[];
}

export interface ClusterItem {
  kind: 'thought' | 'paste' | 'amplification';
  id: string;
  title: string | null;
  preview: string | null;
  score: number;
  facets: ClusterItemFacets | null;
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

export interface GraphThought extends Thought {
  x: number | null;
  y: number | null;
  cluster_id: number | null;
}

export interface GraphResponse {
  thoughts: GraphThought[];
  clusters: Cluster[];
}

export type Route =
  | { view: 'feed'; prefill?: string }
  | { view: 'thread'; id: number }
  | { view: 'tasks' }
  | { view: 'events' }
  | { view: 'framings' }
  | { view: 'framing'; id: number }
  | { view: 'locations' }
  | { view: 'media' }
  | { view: 'movies' }
  | { view: 'books' }
  | { view: 'music' }
  | { view: 'bookmarks' }
  | { view: 'amplifications' }
  | { view: 'capture'; url?: string; text?: string; title?: string }
  | { view: 'browse' }
  | { view: 'questions' }
  | { view: 'canvases' }
  | { view: 'canvas'; id: number }
  | { view: 'graph' };
