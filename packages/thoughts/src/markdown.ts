import { Marked } from 'marked';

const marked = new Marked({
  breaks: true,
  gfm: true,
});

/**
 * Highlight #hashtags in already-rendered HTML.
 * Operates on text nodes only (outside of HTML tags) to avoid mangling markup.
 */
function highlightTags(html: string): string {
  return html.replace(/(>[^<]*)/g, (segment) => {
    return segment.replace(
      /(^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g,
      '$1<span class="thought-tag">#$2</span>',
    );
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const KIND_HREF: Record<string, (id: string) => string> = {
  d: (id) => `/thoughts/documents/${id}`,
  t: (id) => `/thoughts/t/${id}`,
  p: (id) => `/paste/${id}`,
  f: (id) => `/thoughts/framings/${id}`,
  b: (slug) => `/${slug}.html`,
};

const KIND_NAME: Record<string, string> = {
  d: 'doc',
  t: 'thought',
  p: 'paste',
  f: 'frame',
  b: 'post',
};

/**
 * Replace `[[X id]]` and `[[X id|label]]` wiki-link syntax with anchors.
 * Operates on text nodes only (outside of HTML tags) to avoid mangling markup.
 */
function linkWiki(html: string): string {
  return html.replace(/(>[^<]*)/g, (segment) => {
    return segment.replace(
      /\[\[([dtpfb]) ([A-Za-z0-9_\-.]+)(?:\|([^\]|]+))?\]\]/g,
      (_, letter: string, id: string, label?: string) => {
        const href = KIND_HREF[letter](id);
        const kind = KIND_NAME[letter];
        const text = escapeHtml((label?.trim() || `${letter} ${id}`));
        return `<a href="${href}" class="wiki-link" data-kind="${kind}" data-id="${escapeHtml(id)}">${text}</a>`;
      },
    );
  });
}

/** Parse markdown text and return sanitised HTML with hashtag highlighting. */
export function renderMarkdown(text: string): string {
  const raw = marked.parse(text);
  const html = typeof raw === 'string' ? raw : '';
  return highlightTags(linkWiki(html));
}
