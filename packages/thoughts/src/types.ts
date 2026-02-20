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

export type Route =
  | { view: 'feed' }
  | { view: 'thread'; id: number }
  | { view: 'tasks' }
  | { view: 'events' };
