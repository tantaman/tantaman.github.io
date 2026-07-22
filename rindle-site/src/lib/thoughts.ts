import { ulid } from "ulid";

import type { CreateThoughtArgs } from "../../shared/app-def.ts";
import {
  extractThoughtEnrichments,
  normalizeAlbumTitle,
  normalizeMovieTitle,
} from "../../shared/thought-enrichments.ts";
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

export interface ThoughtEnrichmentParent {
  /** All task rows sourced by the direct parent thought. Used to mirror reply-task dependencies. */
  taskIds: readonly string[];
}

/**
 * Turn the eight structured hashtag lanes into mutation-ready rows. This runs at the UI event
 * boundary—not inside the replayed mutator—so every generated id and timestamp is stable across
 * optimistic rebases and the server authority's execution.
 */
export function thoughtEnrichmentArgs(
  body: string,
  createdAt: number,
  contentRevision: string,
  parent?: ThoughtEnrichmentParent,
): CreateThoughtArgs["enrichments"] {
  const extracted = extractThoughtEnrichments(body, createdAt);
  const projects = extracted.projects.map((row) => ({ id: ulid(), ...row, createdAt }));
  const tasks = extracted.tasks.map((row) => ({ id: ulid(), ...row, createdAt }));
  const taskDependencies: CreateThoughtArgs["enrichments"]["taskDependencies"] = [];
  for (const blockerTaskId of parent?.taskIds ?? []) {
    for (const task of tasks) {
      if (taskDependencies.length === 10_000) break;
      taskDependencies.push({
        id: ulid(),
        blockerTaskId,
        blockedTaskId: task.id,
        createdAt,
      });
    }
    if (taskDependencies.length === 10_000) break;
  }

  const seenMovies = new Set<string>();
  const movies = extracted.movies.flatMap((row) => {
    const normalizedTitle = normalizeMovieTitle(row.title);
    if (seenMovies.has(normalizedTitle)) return [];
    seenMovies.add(normalizedTitle);
    return [{ id: ulid(), linkId: ulid(), normalizedTitle, ...row, createdAt }];
  });

  const seenAlbums = new Set<string>();
  const albums = extracted.albums.flatMap((row) => {
    const normalizedTitle = normalizeAlbumTitle(row.title);
    if (seenAlbums.has(normalizedTitle)) return [];
    seenAlbums.add(normalizedTitle);
    return [{ id: ulid(), linkId: ulid(), normalizedTitle, ...row, createdAt }];
  });

  return {
    projects,
    tasks,
    taskDependencies,
    events: extracted.events.map((row) => ({ id: ulid(), ...row, createdAt })),
    questions: extracted.questions.map((row) => ({ id: ulid(), ...row, createdAt })),
    locations: extracted.locations.map((row) => ({
      id: ulid(),
      ...row,
      sourceRevision: contentRevision,
      createdAt,
    })),
    movies,
    books: extracted.books.map((row) => ({ id: ulid(), ...row, createdAt })),
    albums,
  };
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
