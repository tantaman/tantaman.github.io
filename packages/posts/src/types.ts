export interface PostFrontmatter {
  tags?: string[];
  description?: string;
  summary?: string;
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

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  frontmatter: PostFrontmatter;
  status: 'draft' | 'published';
  created_at: number;
  updated_at: number;
}

export interface Post extends PostSummary {
  body: string;
}

export interface PostListResponse {
  posts: PostSummary[];
  meta: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export type Route =
  | { view: 'list' }
  | { view: 'new' }
  | { view: 'edit'; id: number };
