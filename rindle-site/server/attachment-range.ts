/** A single HTTP byte range. Multiple or malformed ranges are ignored; unsatisfiable ones fail. */
export function attachmentRange(header: string | null, size: number): { offset: number; length: number } | null | "unsatisfiable" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
    return "unsatisfiable";
  }
  return { offset: start, length: end - start + 1 };
}
