export interface Attachment {
  key: string;
  name: string;
  type: string;
}

export interface Thought {
  id: number;
  body: string;
  timestamp: number;     // creation time (immutable)
  updated_at: number;    // time the current body was written
  version: number;       // 1 for an unedited thought; bumped on each edit
  parent_id: number | null;
  reply_count: number;
  attachments: Attachment[];
  color: string | null;
  private: boolean;
  duplicate_ids: number[];
}

// Lightweight timeline entry from /thoughts/:id/replies (no body).
export interface ThoughtVersion {
  version: number;
  timestamp: number;
}

// Full version entry from /thoughts/:id/history (includes the body for diffing).
export interface ThoughtHistoryVersion {
  version: number;
  body: string;
  timestamp: number;
}

export interface Ancestor {
  id: number;
  parent_id: number | null;
  body: string;
  timestamp: number;
  color: string | null;
  private: boolean;
}

export interface RelatedItem {
  id: number;
  body: string;
  timestamp: number;
  color: string | null;
}

export interface SimilarItem extends RelatedItem {
  score: number;
}

export interface RelatedResponse {
  outbound: RelatedItem[];
  inbound: RelatedItem[];
  similar: SimilarItem[];
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

export interface Project {
  id: number;
  thought_id: number;
  title: string;
  description: string | null;
  status: string;
  created_at: number;
  archived_at: number | null;
  // Present on list responses.
  task_count?: number;
  completed_count?: number;
}

export interface ProjectTask extends Omit<Task, 'thought_id'> {
  thought_id: number | null;
  project_id: number | null;
  position: number | null;
}

export interface ProjectDependency {
  blocker_task_id: number;
  blocked_task_id: number;
}

export interface ProjectComment {
  id: number;
  project_id: number;
  parent_id: number | null;
  body: string;
  created_at: number;
  updated_at: number | null;
}

export interface ProjectActivity {
  id: number;
  project_id: number;
  kind: string;
  detail: string | null;
  created_at: number;
}

export type ProjectItemType = 'document' | 'thought' | 'bookmark' | 'framing' | 'post' | 'paste';

// Server-resolved display payload for a linked item (null when the target was
// deleted or is private to an anonymous viewer).
export interface ResolvedItemFields {
  title: string;
  snippet: string | null;
  private?: boolean;
  status?: string;
  url?: string | null;
  image_url?: string | null;
  site_name?: string | null;
  color?: string | null;
}

export interface ProjectItem {
  id: number;
  project_id: number;
  item_type: ProjectItemType;
  item_id: string;
  role: string | null;
  position: number | null;
  added_at: number;
  resolved: ResolvedItemFields | null;
}

export interface ProjectAttachment {
  id: number;
  project_id: number;
  attachment_key: string;
  attachment_type: string;
  attachment_name: string;
  created_at: number;
}

export interface ProjectDetail {
  project: Project;
  tasks: ProjectTask[];
  deps: ProjectDependency[];
  comments: ProjectComment[];
  activity: ProjectActivity[];
  items: ProjectItem[];
  attachments: ProjectAttachment[];
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
  node_type: 'thought' | 'post' | 'document' | 'framing';
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
  reply_count: number;
  link_count: number;
  backlink_count: number;
}

export interface FramingPostNode extends FramingNodeBase {
  node_type: 'post';
  body: null;
  timestamp: null;
  color: null;
}

export interface FramingDocumentNode extends FramingNodeBase {
  node_type: 'document';
  title: string;
  body: string;
  updated_at: number;
  private: boolean;
}

export interface FramingFramingNode extends FramingNodeBase {
  node_type: 'framing';
  title: string | null;
  updated_at: number | null;
}

export type FramingNode =
  | FramingThoughtNode
  | FramingPostNode
  | FramingDocumentNode
  | FramingFramingNode;

export interface FramingEdge {
  id: number;
  source_node_id: number;
  target_node_id: number;
  label: string | null;
  source_handle: string | null;
  target_handle: string | null;
  kind: string | null;
}

export interface FramingDetail {
  framing: Framing;
  nodes: FramingNode[];
  edges: FramingEdge[];
}

export type DocumentStatus = 'document' | 'draft' | 'published';

export interface DocumentFrontmatter {
  tags?: string[];
  description?: string;
  layout?: string;
  related?: string[];
  wide?: boolean;
  concern?: string[];
  image?: string;
  date?: string;
  minimalHeader?: boolean;
  noHeader?: boolean;
  js?: string[];
  form?: string;
}

export interface DocumentSummary {
  id: number;
  title: string;
  private: boolean;
  slug: string | null;
  status: DocumentStatus;
  frontmatter: DocumentFrontmatter;
  created_at: number;
  updated_at: number;
}

export interface Document extends DocumentSummary {
  body: string;
  collab_version: number;
  doc_json: unknown | null;
}

export interface CollabStepEntry {
  version: number;
  step: unknown;
  clientID: number | string;
}

export type CollabBootstrap =
  | { initialized: false; head: number }
  | {
      initialized: true;
      snapshot: { version: number; doc: unknown; body: string; title: string };
      steps: CollabStepEntry[];
      head: number;
    };

export interface CollabStepsResponse {
  head: number;
  steps: CollabStepEntry[];
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

