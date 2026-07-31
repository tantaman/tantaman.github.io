import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  SEARCH_MAX_LIMIT,
  SEARCH_PAGE_SIZE,
  searchPastesQuery,
  searchPostsQuery,
  searchThoughtsQuery,
} from "../components/Search.queries.ts";
import { SearchQueryBoundary } from "../components/SearchQueryBoundary.tsx";
import { useSearchResults, type SearchResult } from "../components/SearchResults.ts";
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
    // Seed direct requests for first paint; live typeahead is retained by useSearchResults below.
    // Keeping this SSR-only avoids client.ensure holding one route preload per debounced term.
    ssr: ({ deps }) => {
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
  component: SearchRoute,
});

function SearchRoute() {
  return (
    <SearchQueryBoundary>
      <SearchPage />
    </SearchQueryBoundary>
  );
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

      {debouncedQuery.trim() ? (
        <ActiveSearchPageResults
          query={debouncedQuery}
          limit={limit}
          onLoadMore={() => setLimit((value) => Math.min(value + SEARCH_PAGE_SIZE, SEARCH_MAX_LIMIT))}
        />
      ) : (
        <div className="site-search-status" aria-live="polite">
          Start typing to search the live corpus.
        </div>
      )}
    </section>
  );
}

function ActiveSearchPageResults({
  query,
  limit,
  onLoadMore,
}: {
  query: string;
  limit: number;
  onLoadMore: () => void;
}) {
  const { results, complete, hasMore } = useSearchResults(query, limit);

  return (
    <>
      <div className="site-search-status" aria-live="polite">
        {!complete
          ? "Searching…"
          : `${results.length}${hasMore ? "+" : ""} match${results.length === 1 ? "" : "es"}`}
      </div>

      {results.length === 0 && complete ? (
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
          onClick={onLoadMore}
          disabled={!complete}
        >{complete ? "Search deeper" : "Loading…"}</button>
      ) : null}
    </>
  );
}
