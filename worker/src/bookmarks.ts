export interface BookmarkDef {
  url: string;
  title: string | null;
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const BARE_URL_RE = /(?<!\]\()https?:\/\/[^\s)<>]+/g;

// {host, path} pairs for personal/ephemeral chat transcripts that shouldn't surface
// as public bookmarks even when linked in a thought body.
const EXCLUDED_URL_PATTERNS: { host: RegExp; pathPrefix: string }[] = [
  { host: /^claude\.ai$/i, pathPrefix: "/chat/" },
];

export function isBookmarkableUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return !EXCLUDED_URL_PATTERNS.some(
      (p) => p.host.test(u.hostname) && u.pathname.startsWith(p.pathPrefix),
    );
  } catch {
    return false;
  }
}

export function extractBookmarks(body: string): BookmarkDef[] {
  const seen = new Set<string>();
  const bookmarks: BookmarkDef[] = [];

  // First pass: markdown links [title](url)
  for (const match of body.matchAll(MARKDOWN_LINK_RE)) {
    const url = match[2];
    if (seen.has(url) || !isBookmarkableUrl(url)) continue;
    seen.add(url);
    bookmarks.push({ url, title: match[1].trim() });
  }

  // Second pass: bare URLs not already captured as markdown link targets
  for (const match of body.matchAll(BARE_URL_RE)) {
    const url = match[0];
    if (seen.has(url) || !isBookmarkableUrl(url)) continue;
    seen.add(url);
    bookmarks.push({ url, title: null });
  }

  return bookmarks;
}
