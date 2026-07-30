// Shared client-side ranking for the full search route and the command palette. Rindle supplies the
// bounded live candidate windows; this module merges and ranks them without duplicating that logic
// across the two search surfaces.

import { useMemo } from "react";
import { useRoot } from "@rindle/react";

import {
  searchPastesQuery,
  searchPostsQuery,
  searchThoughtsQuery,
  type SearchPasteRow,
  type SearchPostRow,
  type SearchThoughtRow,
} from "./Search.queries.ts";
import { formatDate } from "../lib/format.ts";
import { pasteDate } from "../lib/paste.ts";
import { formatThoughtTime, thoughtEpochMs } from "../lib/thoughts.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { q } from "../../shared/app-def.ts";

export type SearchResult =
  | { kind: "post"; id: string; title: string; preview: string; date: string; timestamp: number; score: number }
  | { kind: "thought"; id: string; title: string; preview: string; date: string; timestamp: number; score: number }
  | { kind: "paste"; id: string; title: string; preview: string; date: string; timestamp: number; score: number; language: string };

// Keep the hooks mounted while the input is empty without stamping a named query. These impossible
// local-only views avoid opening three remote materializations before the user has searched.
const EMPTY_SEARCH_ID = "\u0000search";
const EMPTY_POSTS_QUERY = q.post.where.id(EMPTY_SEARCH_ID)
  .select("id", "title", "date", "publishedAt", "description", "body", "tags", "concern", "color");
const EMPTY_THOUGHTS_QUERY = q.thought.where.id(EMPTY_SEARCH_ID)
  .select("id", "body", "createdAt", "updatedAt", "color");
const EMPTY_PASTES_QUERY = q.paste.where.id(EMPTY_SEARCH_ID)
  .select("id", "title", "body", "excerpt", "language", "createdAt", "sharedAt");

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD");
}

function queryTerms(value: string): string[] {
  return [...new Set(normalize(value).split(/\s+/u).filter(Boolean).slice(0, 8))];
}

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`#>*_~|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewAround(value: string, terms: readonly string[], fallback: string, max = 230): string {
  const primary = plainText(value);
  const alternate = plainText(fallback);
  const primaryNormalized = normalize(primary);
  const text = terms.some((term) => primaryNormalized.includes(term)) || !alternate ? primary : alternate;
  if (text.length <= max) return text;
  const haystack = normalize(text);
  const indexes = terms.map((term) => haystack.indexOf(term)).filter((index) => index >= 0);
  const first = indexes.length > 0 ? Math.min(...indexes) : 0;
  const start = Math.max(0, first - Math.floor(max * 0.32));
  const end = Math.min(text.length, start + max);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function textScore(query: string, terms: readonly string[], title: string, summary: string, body: string): number {
  const phrase = normalize(query.trim());
  const fields = [normalize(title), normalize(summary), normalize(body)];
  let score = fields[0] === phrase ? 80 : fields[0].startsWith(phrase) ? 36 : fields[0].includes(phrase) ? 24 : 0;
  if (phrase && fields[1].includes(phrase)) score += 12;
  if (phrase && fields[2].includes(phrase)) score += 5;
  for (const term of terms) {
    if (fields[0].includes(term)) score += 12;
    if (fields[1].includes(term)) score += 5;
    if (fields[2].includes(term)) score += 1;
  }
  return score;
}

function postResult(row: SearchPostRow, query: string, terms: readonly string[]): SearchResult {
  return {
    kind: "post",
    id: row.id,
    title: row.title,
    preview: previewAround(row.body, terms, row.description),
    date: formatDate(row.date),
    timestamp: row.publishedAt,
    score: textScore(query, terms, row.title, row.description, row.body) + 2,
  };
}

function thoughtResult(row: SearchThoughtRow, query: string, terms: readonly string[]): SearchResult {
  const plain = plainText(row.body);
  return {
    kind: "thought",
    id: row.id,
    title: plain.length > 72 ? `${plain.slice(0, 72).trim()}…` : plain || "Untitled thought",
    preview: previewAround(row.body, terms, plain),
    date: formatThoughtTime(row.createdAt),
    timestamp: thoughtEpochMs(row.createdAt),
    score: textScore(query, terms, "", "", row.body),
  };
}

function pasteResult(row: SearchPasteRow, query: string, terms: readonly string[]): SearchResult {
  const title = row.title?.trim() || plainText(row.body).split(/\n/u)[0]?.slice(0, 90) || "Untitled paste";
  const timestamp = row.sharedAt ?? row.createdAt;
  return {
    kind: "paste",
    id: row.id,
    title,
    preview: previewAround(row.body, terms, row.excerpt),
    date: pasteDate(timestamp),
    timestamp,
    score: textScore(query, terms, title, row.excerpt, row.body) + 1,
    language: row.language,
  };
}

export function useSearchResults(query: string, limit: number) {
  const args = { search: query, limit };
  const context = currentQueryContext();
  const active = query.trim().length > 0;
  const postsQuery = active ? searchPostsQuery(args) : EMPTY_POSTS_QUERY;
  const thoughtsQuery = active ? searchThoughtsQuery(args, context) : EMPTY_THOUGHTS_QUERY;
  const pastesQuery = active ? searchPastesQuery(args, context) : EMPTY_PASTES_QUERY;
  const [posts, postState] = useRoot(postsQuery);
  const [thoughts, thoughtState] = useRoot(thoughtsQuery);
  const [pastes, pasteState] = useRoot(pastesQuery);
  const terms = useMemo(() => queryTerms(query), [query]);
  const results = useMemo(() => {
    if (terms.length === 0) return [];
    return [
      ...posts.slice(0, limit).map((row) => postResult(row, query, terms)),
      ...thoughts.slice(0, limit).map((row) => thoughtResult(row, query, terms)),
      ...pastes.slice(0, limit).map((row) => pasteResult(row, query, terms)),
    ].sort((a, b) => b.score - a.score || b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  }, [limit, pastes, posts, query, terms, thoughts]);

  return {
    terms,
    results,
    complete: postState.status === "complete" && thoughtState.status === "complete" && pasteState.status === "complete",
    hasMore: posts.length > limit || thoughts.length > limit || pastes.length > limit,
  };
}
