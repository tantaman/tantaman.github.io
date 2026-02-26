export interface Comment {
  id: number;
  slug: string;
  commenter_id: number;
  commenter_name: string;
  parent_id: number | null;
  body: string | null;
  deleted: boolean;
  created_at: number;
}

export interface Commenter {
  id: number;
  display_name: string;
  email: string;
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
