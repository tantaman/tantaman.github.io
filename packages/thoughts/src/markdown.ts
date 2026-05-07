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
  // Split into "inside a tag" vs "outside a tag" segments.
  // We only transform text that is outside of < ... >.
  return html.replace(/(>[^<]*)/g, (segment) => {
    return segment.replace(
      /(^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g,
      '$1<span class="thought-tag">#$2</span>',
    );
  });
}

/**
 * Replace [[123]] or [[123|title]] wiki-link syntax with anchors to #thought-123.
 * Operates on text nodes only (outside of HTML tags) to avoid mangling markup.
 */
function linkThoughts(html: string): string {
  return html.replace(/(>[^<]*)/g, (segment) => {
    return segment.replace(
      /\[\[(\d+)(?:\|([^\]|]+))?\]\]/g,
      (_, id, title) => {
        const text = (title?.trim() || `i${id}`)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<a href="#thought-${id}" class="thought-link">${text}</a>`;
      },
    );
  });
}

/** Parse markdown text and return sanitised HTML with hashtag highlighting. */
export function renderMarkdown(text: string): string {
  const raw = marked.parse(text);
  // marked.parse can return string | Promise<string>; with async: false (default) it's sync
  const html = typeof raw === 'string' ? raw : '';
  return highlightTags(linkThoughts(html));
}
