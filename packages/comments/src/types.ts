export interface Comment {
  id: number;
  slug: string;
  commenter_id: number;
  commenter_name: string;
  commenter_tag?: string;
  parent_id: number | null;
  body: string | null;
  deleted: boolean;
  is_owner: boolean;
  created_at: number;
}

export interface Commenter {
  id: number;
  display_name: string;
  email: string;
  is_owner?: boolean;
  tag?: string;
}

export interface LikeState {
  liked: boolean;
  like_count: number;
}

export interface CommentsResponse {
  comments: Comment[];
  like_count: number;
  liked: boolean;
}

export interface AuthSession {
  token: string;
  commenter: Commenter;
}

export interface Notification {
  id: number;
  comment_id: number;
  slug: string;
  commenter_name: string;
  commenter_tag?: string;
  body: string;
  created_at: number;
  is_read: boolean;
}

export interface NotificationsResponse {
  unread_count: number;
  notifications: Notification[];
}
