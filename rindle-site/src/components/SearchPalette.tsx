import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useSearchResults, type SearchResult } from "./SearchResults.ts";
import { SearchQueryBoundary } from "./SearchQueryBoundary.tsx";
import "./SearchPalette.css";

const PALETTE_QUERY_LIMIT = 12;
const PALETTE_RESULT_LIMIT = 10;

export default function SearchPalette(props: { onClose: () => void }) {
  return (
    <SearchQueryBoundary>
      <SearchPaletteContent {...props} />
    </SearchQueryBoundary>
  );
}

function SearchPaletteContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const fullSearchButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { results, complete, hasMore } = useSearchResults(debouncedQuery, PALETTE_QUERY_LIMIT);
  const visibleResults = useMemo(() => results.slice(0, PALETTE_RESULT_LIMIT), [results]);

  useEffect(() => {
    input.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(visibleResults.length - 1, 0)));
  }, [visibleResults.length]);

  useEffect(() => {
    document.querySelector(`#site-search-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function updateQuery(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    const next = value.trim();
    if (!next) {
      setDebouncedQuery("");
      return;
    }
    timer.current = setTimeout(() => setDebouncedQuery(next), 150);
  }

  function openResult(result: SearchResult) {
    onClose();
    if (result.kind === "post") {
      void navigate({ to: "/$slug", params: { slug: result.id } });
    } else if (result.kind === "thought") {
      void navigate({ to: "/thoughts/$id", params: { id: result.id } });
    } else {
      void navigate({ to: "/paste/$id", params: { id: result.id } });
    }
  }

  function openFullSearch() {
    const next = query.trim();
    onClose();
    void navigate({ to: "/search", search: next ? { q: next } : {} });
  }

  function handleInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => visibleResults.length === 0 ? 0 : (current + 1) % visibleResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => visibleResults.length === 0 ? 0 : (current - 1 + visibleResults.length) % visibleResults.length);
    } else if (event.key === "Home" && visibleResults.length > 0) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && visibleResults.length > 0) {
      event.preventDefault();
      setActiveIndex(visibleResults.length - 1);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const result = visibleResults[activeIndex];
      if (result) openResult(result);
      else if (query.trim()) openFullSearch();
    }
  }

  function trapFocus(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    if (event.shiftKey && event.target === input.current) {
      event.preventDefault();
      fullSearchButton.current?.focus();
    } else if (!event.shiftKey && event.target === fullSearchButton.current) {
      event.preventDefault();
      input.current?.focus();
    }
  }

  const waitingForDebounce = query.trim() !== debouncedQuery;
  const status = query.trim().length === 0
    ? "Type to search posts, thoughts, and pastes."
    : waitingForDebounce || (!complete && visibleResults.length === 0)
      ? "Searching…"
      : visibleResults.length === 0
        ? "No matching posts, thoughts, or pastes."
        : null;

  return (
    <div
      className="search-palette-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search the site"
        onKeyDown={trapFocus}
      >
        <div className="search-palette-input-row">
          <span aria-hidden="true">⌕</span>
          <input
            ref={input}
            id="site-search-palette-input"
            type="search"
            role="combobox"
            aria-label="Search posts, thoughts, and pastes"
            aria-controls="site-search-palette-results"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-activedescendant={visibleResults.length > 0 ? `site-search-option-${activeIndex}` : undefined}
            autoComplete="off"
            spellCheck="false"
            maxLength={200}
            placeholder="Search anything…"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <kbd>esc</kbd>
        </div>

        <div
          id="site-search-palette-results"
          className="search-palette-results"
          role="listbox"
          aria-busy={waitingForDebounce || !complete}
        >
          {status ? (
            <div className="search-palette-status" aria-live="polite">
              {status === "Searching…" ? <span className="search-palette-spinner" aria-hidden="true" /> : null}
              <p>{status}</p>
            </div>
          ) : visibleResults.map((result, index) => (
            <button
              key={`${result.kind}:${result.id}`}
              id={`site-search-option-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              className="search-palette-result"
              data-active={index === activeIndex ? "" : undefined}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => openResult(result)}
            >
              <span className={`site-search-kind kind-${result.kind}`}>{result.kind}</span>
              <span className="search-palette-result-copy">
                <strong>{result.title}</strong>
                <small>{result.preview}</small>
              </span>
              <span className="search-palette-result-meta">
                {result.kind === "paste" ? result.language : result.date}
              </span>
            </button>
          ))}
        </div>

        <footer className="search-palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <button ref={fullSearchButton} type="button" onClick={openFullSearch}>
            {hasMore || results.length > PALETTE_RESULT_LIMIT ? "View all results" : "Full search"}
          </button>
        </footer>
      </section>
    </div>
  );
}
