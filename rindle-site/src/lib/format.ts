// Tiny date formatting helper, shared by the views. Pure + SSR-safe (same output on server and client
// for a given input, so hydration matches).

const DATE_TIME = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function formatDateTime(ms: number): string {
  return DATE_TIME.format(new Date(ms));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format an ISO date string ("2026-05-04") as "May 4, 2026". Parses the string PARTS rather than a
 *  `Date`, so it is timezone-independent — the server and client produce the same text and hydration
 *  matches. Returns "" for a null/blank/malformed input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  const name = MONTHS[Number(month) - 1];
  if (!name) return iso;
  return `${name} ${Number(day)}, ${year}`;
}

/** Parse a `tags`/`concern`/`author` JSON-string column back to a string[] (see migrations/0002_posts).
 *  Tolerant: a non-array or malformed value degrades to []. */
export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
