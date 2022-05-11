export type Section = SiteState['section'];
export type SiteState = BlogState | TweetState | HomeState;

export type HomeState = {
  section: 'home';
};

export type BlogState = {
  section: 'blog';
  post?: string;
};

export type TweetState = {
  section: 'tweets';
};

export type Index = {
  [key: string]: ContentMeta;
};

export type ContentMeta = {
  frontmatter: any;
  greymatter: any;
};
