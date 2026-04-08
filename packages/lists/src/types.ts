export interface List {
  id: number;
  uuid: string;
  name: string;
  created_at: number;
  archived_at: number | null;
  item_count: number;
  completed_count: number;
}

export interface ListItem {
  id: number;
  list_id: number;
  text: string;
  completed: number;
  position: number;
  created_at: number;
}

export type Route =
  | { view: 'dashboard' }
  | { view: 'list'; uuid: string };
