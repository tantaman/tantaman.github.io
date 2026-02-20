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

export type Route =
  | { view: 'feed' }
  | { view: 'thread'; id: number }
  | { view: 'tag'; tag: string };
