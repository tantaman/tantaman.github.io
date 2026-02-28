export interface BookmarkDef {
  url: string;
  title: string | null;
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const BARE_URL_RE = /(?<!\]\()https?:\/\/[^\s)<>]+/g;

export function extractBookmarks(body: string): BookmarkDef[] {
  const seen = new Set<string>();
  const bookmarks: BookmarkDef[] = [];

  // First pass: markdown links [title](url)
  for (const match of body.matchAll(MARKDOWN_LINK_RE)) {
    const url = match[2];
    if (!seen.has(url)) {
      seen.add(url);
      bookmarks.push({ url, title: match[1].trim() });
    }
  }

  // Second pass: bare URLs not already captured as markdown link targets
  for (const match of body.matchAll(BARE_URL_RE)) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      bookmarks.push({ url, title: null });
    }
  }

  return bookmarks;
}
