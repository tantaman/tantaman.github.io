import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import {
  SEARCH_MAX_LIMIT,
  SEARCH_PAGE_SIZE,
  searchPastesQuery,
  searchPostsQuery,
  searchThoughtsQuery,
  type SearchPasteRow,
  type SearchPostRow,
  type SearchThoughtRow,
} from "../components/Search.queries.ts";
import { formatDate } from "../lib/format.ts";
import { pasteDate } from "../lib/paste.ts";
import { formatThoughtTime, thoughtEpochMs } from "../lib/thoughts.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

interface SearchParams {
  q?: string;
}

export const Route = createFileRoute("/search")({
  validateSearch: (raw: Record<string, unknown>): SearchParams => ({
    q: typeof raw.q === "string" && raw.q.length <= 200 ? raw.q : undefined,
  }),
  loaderDeps: ({ search }) => ({ search: search.q ?? "" }),
  loader: rindle.loader({
    query: ({ deps }) => {
      const search = typeof deps.search === "string" ? deps.search.trim() : "";
      if (!search) return [];
      const args = { search, limit: SEARCH_PAGE_SIZE };
      const context = currentQueryContext();
      return [searchPostsQuery(args), searchThoughtsQuery(args, context), searchPastesQuery(args, context)];
    },
  }),
  head: () => ({
    meta: [
      { title: "Search — Tantaman" },
      { name: "description", content: "Search posts, thoughts, and shared pastes." },
    ],
  }),
  component: SearchPage,
});

type SearchResult =
  | { kind: "post"; id: string; title: string; preview: string; date: string; timestamp: number; score: number }
  | { kind: "thought"; id: string; title: string; preview: string; date: string; timestamp: number; score: number }
  | { kind: "paste"; id: string; title: string; preview: string; date: string; timestamp: number; score: number; language: string };

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

function ResultLink({ result }: { result: SearchResult }) {
  const content = (
    <>
      <div className="site-search-result-head">
        <span className={`site-search-kind kind-${result.kind}`}>{result.kind}</span>
        <h2>{result.title}</h2>
      </div>
      <p>{result.preview}</p>
      <div className="site-search-result-meta">
        {result.date ? <time>{result.date}</time> : null}
        {result.kind === "paste" ? <span>{result.language}</span> : null}
      </div>
    </>
  );

  if (result.kind === "post") return <Link to="/$slug" params={{ slug: result.id }}>{content}</Link>;
  if (result.kind === "thought") return <Link to="/thoughts/$id" params={{ id: result.id }}>{content}</Link>;
  return <Link to="/paste/$id" params={{ id: result.id }}>{content}</Link>;
}

function SearchPage() {
  const routeSearch = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [query, setQuery] = useState(routeSearch.q ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(routeSearch.q ?? "");
  const [limit, setLimit] = useState(SEARCH_PAGE_SIZE);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    const next = routeSearch.q ?? "";
    if (next === query) return;
    if (timer.current) clearTimeout(timer.current);
    setQuery(next);
    setDebouncedQuery(next);
    setLimit(SEARCH_PAGE_SIZE);
  }, [routeSearch.q]);

  function updateQuery(value: string) {
    setQuery(value);
    setLimit(SEARCH_PAGE_SIZE);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = value.trim();
      setDebouncedQuery(next);
      void navigate({ search: next ? { q: next } : {}, replace: true });
    }, 220);
  }

  const args = { search: debouncedQuery, limit };
  const [posts, postState] = useRoot(searchPostsQuery, args);
  const context = currentQueryContext();
  const [thoughts, thoughtState] = useRoot(searchThoughtsQuery, args, context);
  const [pastes, pasteState] = useRoot(searchPastesQuery, args, context);
  const terms = useMemo(() => queryTerms(debouncedQuery), [debouncedQuery]);
  const results = useMemo(() => {
    if (terms.length === 0) return [];
    return [
      ...posts.slice(0, limit).map((row) => postResult(row, debouncedQuery, terms)),
      ...thoughts.slice(0, limit).map((row) => thoughtResult(row, debouncedQuery, terms)),
      ...pastes.slice(0, limit).map((row) => pasteResult(row, debouncedQuery, terms)),
    ].sort((a, b) => b.score - a.score || b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  }, [debouncedQuery, limit, pastes, posts, terms, thoughts]);

  const complete = postState.status === "complete" && thoughtState.status === "complete" && pasteState.status === "complete";
  const hasMore = posts.length > limit || thoughts.length > limit || pastes.length > limit;

  return (
    <section className="site-search-page">
      <header>
        <p className="site-search-kicker">live index</p>
        <h1>Find anything.</h1>
        <p>Posts, thoughts, and shared pastes—searched together and kept current by Rindle.</p>
      </header>

      <div className="site-search-box">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Search ideas, phrases, code…"
          aria-label="Search posts, thoughts, and pastes"
          autoFocus
        />
        {query ? <button type="button" onClick={() => updateQuery("")} aria-label="Clear search">×</button> : null}
      </div>

      <div className="site-search-status" aria-live="polite">
        {terms.length === 0
          ? "Start typing to search the live corpus."
          : !complete
            ? "Searching…"
            : `${results.length}${hasMore ? "+" : ""} match${results.length === 1 ? "" : "es"}`}
      </div>

      {terms.length > 0 && results.length === 0 && complete ? (
        <div className="site-search-empty">
          <span aria-hidden="true">∅</span>
          <p>No matching posts, thoughts, or pastes.</p>
        </div>
      ) : (
        <div className="site-search-results">
          {results.map((result) => (
            <article key={`${result.kind}:${result.id}`} className="site-search-result">
              <ResultLink result={result} />
            </article>
          ))}
        </div>
      )}

      {hasMore && limit < SEARCH_MAX_LIMIT ? (
        <button
          type="button"
          className="site-search-more"
          onClick={() => setLimit((value) => Math.min(value + SEARCH_PAGE_SIZE, SEARCH_MAX_LIMIT))}
          disabled={!complete}
        >{complete ? "Search deeper" : "Loading…"}</button>
      ) : null}
    </section>
  );
}
