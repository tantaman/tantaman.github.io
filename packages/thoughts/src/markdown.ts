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
      '$1<a class="thought-tag thought-tag--link" href="#tag-$2" data-tag="$2">#$2</a>',
    );
  });
}

/** Parse markdown text and return sanitised HTML with hashtag highlighting. */
export function renderMarkdown(text: string): string {
  const raw = marked.parse(text);
  // marked.parse can return string | Promise<string>; with async: false (default) it's sync
  const html = typeof raw === 'string' ? raw : '';
  return highlightTags(html);
}
