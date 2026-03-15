export function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---\n*/m, "")           // frontmatter
    .replace(/^#{1,6}\s+/gm, "")                   // heading markers
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")           // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")        // links → text
    .replace(/```[\s\S]*?```/g, "")                 // fenced code blocks
    .replace(/`([^`]+)`/g, "$1")                    // inline code
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")   // bold/italic
    .replace(/^\s*[-*+]\s+/gm, "")                  // list markers
    .replace(/^\s*\d+\.\s+/gm, "")                  // ordered list markers
    .replace(/^>\s+/gm, "")                         // blockquotes
    .replace(/\n{3,}/g, "\n\n")                     // collapse blank lines
    .trim();
}

export function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split on sentence boundaries
    let splitAt = -1;
    for (const sep of [". ", "? ", "! ", "\n"]) {
      const idx = remaining.lastIndexOf(sep, maxLen);
      if (idx > 0 && idx > splitAt) {
        splitAt = idx + sep.length;
      }
    }

    // Fallback: split on word boundary
    if (splitAt <= 0) {
      splitAt = remaining.lastIndexOf(" ", maxLen);
    }

    // Last resort: hard split
    if (splitAt <= 0) {
      splitAt = maxLen;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  return chunks;
}
