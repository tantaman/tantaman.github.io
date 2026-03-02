const CLAUDE_SVG = `<svg class="author-logo author-logo-claude" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label="Claude"><path d="M16.1 2.96l-4.44 14.6L7.14 2.52a.87.87 0 0 0-.87-.68H.87A.87.87 0 0 0 0 2.7a.87.87 0 0 0 .04.27l6.34 18.7a.87.87 0 0 0 .83.6h3.52a.87.87 0 0 0 .83-.61L16.1 6.7l4.54 14.97a.87.87 0 0 0 .83.61h3.53a.87.87 0 0 0 .83-.61L32 2.96" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="5" r="2.5"/><path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm0 17a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" fill="none" stroke="currentColor" stroke-width="0"/></svg>`;

// Simplified Claude sparkle mark
const CLAUDE_LOGO = `<svg class="author-logo author-logo-claude" width="14" height="14" viewBox="0 0 48 48" fill="none" aria-label="Claude"><path d="M30.58 8.04c-.56-1.97-3.3-1.97-3.87 0l-2.52 8.82a2 2 0 0 1-1.37 1.37l-8.82 2.52c-1.97.56-1.97 3.3 0 3.87l8.82 2.52a2 2 0 0 1 1.37 1.37l2.52 8.82c.56 1.97 3.3 1.97 3.87 0l2.52-8.82a2 2 0 0 1 1.37-1.37l8.82-2.52c1.97-.56 1.97-3.3 0-3.87l-8.82-2.52a2 2 0 0 1-1.37-1.37l-2.52-8.82z" fill="currentColor"/><path d="M13.65 3.35c-.3-1.06-1.78-1.06-2.08 0L10.4 7.7a1 1 0 0 1-.7.7l-4.35 1.17c-1.06.3-1.06 1.78 0 2.08l4.35 1.17a1 1 0 0 1 .7.7l1.17 4.35c.3 1.06 1.78 1.06 2.08 0l1.17-4.35a1 1 0 0 1 .7-.7l4.35-1.17c1.06-.3 1.06-1.78 0-2.08l-4.35-1.17a1 1 0 0 1-.7-.7L13.65 3.35z" fill="currentColor"/></svg>`;

const QWEN_LOGO = `<svg class="author-logo author-logo-qwen" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label="Qwen"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16.5" text-anchor="middle" font-size="13" font-weight="700" font-family="system-ui" fill="currentColor">Q</text></svg>`;

const TANTAMAN_LOGO = `<span class="author-logo author-logo-tantaman" aria-label="Tantaman">T</span>`;

const AUTHOR_LOGOS: Record<string, string> = {
  tantaman: TANTAMAN_LOGO,
  claude: CLAUDE_LOGO,
  qwen: QWEN_LOGO,
};

function resolveAuthors(authors?: string[]): string[] {
  if (!authors || authors.length === 0) return ['tantaman'];
  return authors;
}

export function renderAuthorLogosHtml(authors?: string[]): string {
  const resolved = resolveAuthors(authors);
  const logos = resolved
    .map((a) => AUTHOR_LOGOS[a])
    .filter(Boolean)
    .join('');
  return `<span class="author-logos">${logos}</span>`;
}

export function renderAuthorLogosHast(authors?: string[]): {
  type: 'raw';
  value: string;
} {
  return {
    type: 'raw',
    value: ' · ' + renderAuthorLogosHtml(authors),
  };
}
