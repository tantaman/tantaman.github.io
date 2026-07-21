import { marked } from "marked";

const wikiSlug = (target: string) => "/" + target.trim().toLowerCase().replace(/\s+/g, "-");

/** Render the live editor's markdown with the same wiki-link convention as the legacy seed path. */
export function renderMarkdown(markdown: string): string {
  const withWikiLinks = markdown.replace(/\[\[([^\]]+)\]\]/g, (_all, inner: string) => {
    const divider = inner.search(/[:|]/);
    const target = (divider === -1 ? inner : inner.slice(0, divider)).trim();
    const label = (divider === -1 ? inner : inner.slice(divider + 1)).trim() || target;
    return `[${label}](${wikiSlug(target)})`;
  });
  return marked.parse(withWikiLinks, { async: false }) as string;
}

/** Legacy-compatible card fallback: the first Markdown image URL in the post body. */
export function firstMarkdownImage(markdown: string): string | null {
  const match = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/m.exec(
    markdown,
  );
  return match ? match[1] || match[2] || null : null;
}

export function estimateReadingMinutes(markdown: string): number {
  const text = markdown
    .split("\n")
    .filter((line) => !line.trim().startsWith("import "))
    .join("\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}
