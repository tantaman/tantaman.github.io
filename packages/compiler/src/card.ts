export function tagId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function readingTime(wordCount: number): number {
  return Math.max(1, Math.round((wordCount || 0) / 200));
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

export function renderPills(data: {
  subjects: string[];
  concerns: string[];
  form: string;
}): string {
  const subjects = (data.subjects || []).map(
    (s) =>
      `<span class="pill pill-subject" data-facet="subject" data-value="${tagId(s)}">${s}</span>`,
  );
  const concerns = (data.concerns || []).map(
    (c) =>
      `<span class="pill pill-concern" data-facet="concern" data-value="${tagId(c)}">${c}</span>`,
  );
  const form = `<span class="pill pill-form" data-facet="form" data-value="${tagId(data.form)}">${data.form}</span>`;
  const pills = [...subjects, ...concerns, form];
  return `<div class="card-pills">${pills.join('')}</div>`;
}

export function stripTags(html: string): string {
  return (html || '').replace(/<[^>]*>/g, '');
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  const cut = str.lastIndexOf(' ', max);
  return str.slice(0, cut > 0 ? cut : max) + '\u2026';
}
