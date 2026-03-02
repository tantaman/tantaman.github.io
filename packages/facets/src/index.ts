export interface Post {
  title: string;
  url: string;
  date: string;
  description: string;
  subjects: string[];
  concerns: string[];
  form: string;
  kind?: string;
  image?: string;
  sentimentColor?: string;
  wordCount?: number;
}

export interface FacetFilters {
  subject?: Set<string> | string[];
  concern?: Set<string> | string[];
  form?: Set<string> | string[];
  kind?: Set<string> | string[];
}

export interface FacetCounts {
  subject: Record<string, number>;
  concern: Record<string, number>;
  form: Record<string, number>;
  kind: Record<string, number>;
}

export function tagId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function inferForm(
  collection: string,
  meta: Record<string, any>,
): string {
  if (meta.frontmatter?.form) return meta.frontmatter.form;
  if (collection === 'the-mirror-room/') return 'story';
  if (collection === 'chats/') return 'chat';
  return 'essay';
}

function toSet(v: Set<string> | string[] | undefined): Set<string> {
  if (!v) return new Set();
  if (v instanceof Set) return v;
  return new Set(v);
}

/** AND across facets, AND within subject/concern, OR within form/kind */
export function filterPosts(posts: Post[], filters: FacetFilters): Post[] {
  const subjects = toSet(filters.subject);
  const concerns = toSet(filters.concern);
  const forms = toSet(filters.form);
  const kinds = toSet(filters.kind);

  return posts.filter((p) => {
    if (subjects.size > 0) {
      const slugged = new Set(p.subjects.map((s) => tagId(s)));
      for (const v of subjects) {
        if (!slugged.has(v)) return false;
      }
    }
    if (concerns.size > 0) {
      const slugged = new Set(p.concerns.map((c) => tagId(c)));
      for (const v of concerns) {
        if (!slugged.has(v)) return false;
      }
    }
    if (forms.size > 0) {
      if (!forms.has(tagId(p.form))) return false;
    }
    if (kinds.size > 0) {
      if (!p.kind || !kinds.has(tagId(p.kind))) return false;
    }
    return true;
  });
}

export function countFacetValues(posts: Post[]): FacetCounts {
  const counts: FacetCounts = { subject: {}, concern: {}, form: {}, kind: {} };
  for (const p of posts) {
    for (const s of p.subjects) {
      const id = tagId(s);
      counts.subject[id] = (counts.subject[id] || 0) + 1;
    }
    for (const c of p.concerns) {
      const id = tagId(c);
      counts.concern[id] = (counts.concern[id] || 0) + 1;
    }
    const fid = tagId(p.form);
    counts.form[fid] = (counts.form[fid] || 0) + 1;
    if (p.kind) {
      const kid = tagId(p.kind);
      counts.kind[kid] = (counts.kind[kid] || 0) + 1;
    }
  }
  return counts;
}
