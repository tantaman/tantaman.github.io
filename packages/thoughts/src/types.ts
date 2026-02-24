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
  reply_count: number;
  attachments: Attachment[];
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

export interface FramingPlacement {
  thought_id: number;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  body: string;
  timestamp: number;
}

export interface FramingEdge {
  id: number;
  source_thought_id: number;
  target_thought_id: number;
  label: string | null;
}

export interface FramingDetail {
  framing: Framing;
  thoughts: FramingPlacement[];
  edges: FramingEdge[];
}

export type Route =
  | { view: 'feed' }
  | { view: 'thread'; id: number }
  | { view: 'tasks' }
  | { view: 'events' }
  | { view: 'framings' }
  | { view: 'framing'; id: number };
