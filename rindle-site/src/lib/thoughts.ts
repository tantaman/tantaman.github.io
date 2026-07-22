import { ulid } from "ulid";

import type { CreateThoughtArgs } from "../../shared/app-def.ts";
import { renderMarkdown } from "./markdown.ts";

const THOUGHT_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Legacy captures used epoch seconds; new Rindle callsites use epoch milliseconds. Accept both so
 * imported thoughts and newly-authored rows share one deterministic, hydration-safe formatter. */
export function thoughtEpochMs(timestamp: number): number {
  return timestamp < 100_000_000_000 ? timestamp * 1_000 : timestamp;
}

export function formatThoughtTime(timestamp: number): string {
  return THOUGHT_TIME.format(new Date(thoughtEpochMs(timestamp)));
}

export function thoughtDateTime(timestamp: number): string {
  return new Date(thoughtEpochMs(timestamp)).toISOString();
}

export function shortThoughtId(id: string): string {
  if (/^\d+$/.test(id) || id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

/** Matches the original Thoughts tag grammar: ASCII letter first, then letters, numbers, `_` or
 * `-`; identity is lowercase and first occurrence determines display order. */
export function extractThoughtTags(body: string): string[] {
  const matches = body.matchAll(/(^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g);
  const tags = new Set<string>();
  for (const match of matches) tags.add(match[2].toLowerCase());
  return [...tags];
}

/** Mutation-ready tag rows. Called only from UI event handlers, so ULID generation remains outside
 * the replayed shared mutator body. */
export function thoughtTagArgs(body: string): CreateThoughtArgs["tags"] {
  return extractThoughtTags(body).map((name, position) => ({
    id: ulid(),
    tagId: name,
    name,
    normalizedName: name,
    position,
  }));
}

/** SHA-256 keeps the migrated body's content identity compatible with the legacy model. */
export async function hashThoughtBody(body: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Old numeric `[[123]]` references and explicit `[[thought:ID|label]]` references route into the
 * new thread UI. Other wiki links retain the blog renderer's normal slug behavior. */
export function renderThoughtMarkdown(markdown: string): string {
  const explicit = markdown.replace(
    /\[\[thought:([a-zA-Z0-9_-]+)(?:\|([^\]]+))?\]\]/g,
    (_all, id: string, label?: string) => `[${label?.trim() || `#${id}`}](/thoughts/${encodeURIComponent(id)})`,
  );
  const legacy = explicit.replace(
    /\[\[(\d+)(?:\|([^\]]+))?\]\]/g,
    (_all, id: string, label?: string) => `[${label?.trim() || `#${id}`}](/thoughts/${id})`,
  );
  return renderMarkdown(legacy);
}
