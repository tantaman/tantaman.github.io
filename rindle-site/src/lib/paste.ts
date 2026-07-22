import type { PasteLanguage } from "../../shared/app-def.ts";

export const PASTE_LANGUAGE_OPTIONS: ReadonlyArray<{ value: PasteLanguage; label: string }> = [
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "Plain text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "tsx", label: "TSX" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
];

/** Match the legacy paste bin's title inference so imported and newly-authored rows read the same. */
export function extractPasteTitle(body: string, language: PasteLanguage): string | null {
  if (language === "html") {
    const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match?.[1]) return match[1].trim().slice(0, 300) || null;
  }
  if (language === "markdown") {
    const match = body.match(/^#{1,6}\s+(.+)/m);
    if (match?.[1]) return match[1].trim().slice(0, 300) || null;
  }
  const firstLine = body.split("\n").find((line) => line.trim().length > 0)?.trim();
  if (!firstLine) return null;
  return firstLine.length > 120 ? `${firstLine.slice(0, 120)}…` : firstLine;
}

/** A bounded, subscription-friendly feed preview. The full body remains in the by-id view only. */
export function pasteExcerpt(body: string, maxLength = 300): string {
  const plain = body
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`~\[\]()>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}

export function pasteDate(timestamp: number | null): string {
  return timestamp === null ? "" : new Date(timestamp).toISOString().slice(0, 10);
}
