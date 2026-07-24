import { useEffect, useMemo, useState } from "react";
import { useRoot } from "@rindle/react";

import type { ExploreNodeRow, ExploreSessionRow } from "../../schema.local.ts";
import { formatDate } from "../../lib/format.ts";
import { pasteDate } from "../../lib/paste.ts";
import { formatThoughtTime, thoughtEpochMs } from "../../lib/thoughts.ts";
import { currentQueryContext } from "../../rindle-client.ts";
import {
  searchPastesQuery,
  searchPostsQuery,
  searchThoughtsQuery,
} from "../Search.queries.ts";
import type { ExploreExpansionKind, ExploreItem } from "./types.ts";

const SEARCH_LIMIT = 12;

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/[`#>*_~|]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  const clean = plainText(value);
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

function searchScore(item: ExploreItem, query: string): number {
  const needle = query.trim().toLocaleLowerCase();
  const title = item.title.toLocaleLowerCase();
  const preview = item.preview.toLocaleLowerCase();
  return title === needle ? 100 : title.startsWith(needle) ? 50 : title.includes(needle) ? 25 : preview.includes(needle) ? 10 : 0;
}

export function ExplorePanel({
  sessions,
  activeSession,
  activeSessionId,
  focusNode,
  focusItem,
  nodeCount,
  edgeCount,
  candidateCounts,
  candidateReady,
  status,
  onSelectSession,
  onCreateTrail,
  onRenameTrail,
  onDeleteTrail,
  onSeed,
  onExpand,
  onTogglePinned,
  onCollapse,
}: {
  sessions: readonly ExploreSessionRow[];
  activeSession: ExploreSessionRow | null;
  activeSessionId: string | null;
  focusNode: ExploreNodeRow | null;
  focusItem: ExploreItem | null;
  nodeCount: number;
  edgeCount: number;
  candidateCounts: Record<ExploreExpansionKind, number>;
  candidateReady: Record<ExploreExpansionKind, boolean>;
  status: string;
  onSelectSession: (id: string) => void;
  onCreateTrail: () => void;
  onRenameTrail: (title: string) => void;
  onDeleteTrail: () => void;
  onSeed: (item: ExploreItem, query: string) => void;
  onExpand: (kind: ExploreExpansionKind) => void;
  onTogglePinned: (id: string) => void;
  onCollapse: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [title, setTitle] = useState(activeSession?.title ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => setTitle(activeSession?.title ?? ""), [activeSession?.id, activeSession?.title]);

  const args = { search: debouncedQuery, limit: SEARCH_LIMIT };
  const context = currentQueryContext();
  const [posts, postState] = useRoot(searchPostsQuery, args);
  const [thoughts, thoughtState] = useRoot(searchThoughtsQuery, args, context);
  const [pastes, pasteState] = useRoot(searchPastesQuery, args, context);
  const results = useMemo<ExploreItem[]>(() => {
    if (!debouncedQuery) return [];
    const items: ExploreItem[] = [
      ...posts.slice(0, SEARCH_LIMIT).map((row) => ({
        kind: "post" as const,
        id: row.id,
        title: row.title,
        preview: truncate(row.description || row.body, 150),
        timestamp: row.publishedAt,
        date: formatDate(row.date),
        color: row.color,
      })),
      ...thoughts.slice(0, SEARCH_LIMIT).map((row) => {
        const text = truncate(row.body, 150);
        return {
          kind: "thought" as const,
          id: row.id,
          title: truncate(row.body, 76) || "Untitled thought",
          preview: text,
          timestamp: thoughtEpochMs(row.createdAt),
          date: formatThoughtTime(row.createdAt),
          color: row.color,
        };
      }),
      ...pastes.slice(0, SEARCH_LIMIT).map((row) => ({
        kind: "paste" as const,
        id: row.id,
        title: row.title?.trim() || truncate(row.body, 76) || "Untitled paste",
        preview: truncate(row.excerpt || row.body, 150),
        timestamp: row.createdAt,
        date: pasteDate(row.sharedAt ?? row.createdAt),
        color: null,
        meta: row.language,
      })),
    ];
    return items
      .sort((a, b) => searchScore(b, debouncedQuery) - searchScore(a, debouncedQuery) || b.timestamp - a.timestamp)
      .slice(0, 24);
  }, [debouncedQuery, pastes, posts, thoughts]);
  const searchComplete = postState.status === "complete" && thoughtState.status === "complete" && pasteState.status === "complete";

  const modes: Array<{ kind: ExploreExpansionKind; label: string; hint: string }> = [
    { kind: "mixed", label: "Mixed fan", hint: "A diversified set from every available relation" },
    { kind: "direct", label: "Direct", hint: "Links, backlinks, replies, parents, and forks" },
    { kind: "similar", label: "Similar", hint: "Items in the same semantic cluster" },
    { kind: "curated", label: "Co-framed", hint: "Items intentionally placed together before" },
    { kind: "temporal", label: "Nearby", hint: "The closest captures within two weeks" },
  ];

  return (
    <aside className="explore-panel">
      <header className="explore-panel-head">
        <div>
          <span className="explore-kicker">local trail</span>
          <h1>Explore</h1>
        </div>
        <button type="button" className="explore-new-trail" onClick={onCreateTrail}>New</button>
      </header>

      <div className="explore-session-controls">
        <select
          value={activeSessionId ?? ""}
          onChange={(event) => onSelectSession(event.target.value)}
          aria-label="Exploration trail"
        >
          {sessions.length === 0 ? <option value="">No saved local trails</option> : null}
          {sessions.map((session) => <option value={session.id} key={session.id}>{session.title}</option>)}
        </select>
        {activeSession ? (
          <button type="button" onClick={onDeleteTrail} title="Delete this local trail" aria-label="Delete trail">×</button>
        ) : null}
      </div>
      {activeSession ? (
        <input
          className="explore-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => { if (title.trim() && title.trim() !== activeSession.title) onRenameTrail(title); }}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
          aria-label="Trail title"
        />
      ) : null}
      <p className="explore-session-meta">
        {activeSession ? `${nodeCount} node${nodeCount === 1 ? "" : "s"} · ${edgeCount} connection${edgeCount === 1 ? "" : "s"}` : "Start from a search result."}
      </p>

      <section className="explore-search-section">
        <label htmlFor="explore-search">Seed or add content</label>
        <div className="explore-search-box">
          <span aria-hidden="true">⌕</span>
          <input
            id="explore-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search thoughts, posts, pastes…"
          />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button> : null}
        </div>
        {debouncedQuery && (!searchComplete || results.length > 0) ? (
          <div className="explore-search-results">
            {!searchComplete && results.length === 0 ? <p>Searching…</p> : null}
            {results.map((item) => (
              <button type="button" key={`${item.kind}:${item.id}`} onClick={() => onSeed(item, debouncedQuery)}>
                <span className={`explore-search-kind kind-${item.kind}`}>{item.kind}</span>
                <strong>{item.title}</strong>
                <small>{item.date || item.meta}</small>
              </button>
            ))}
          </div>
        ) : null}
        {debouncedQuery && searchComplete && results.length === 0 ? <p className="explore-panel-empty">No matches.</p> : null}
      </section>

      <section className="explore-focus-section">
        <div className="explore-section-title">
          <span>Focused node</span>
          {focusNode ? (
            <button type="button" onClick={() => onTogglePinned(focusNode.id)}>
              {focusNode.pinned === 1 ? "◆ pinned" : "◇ pin"}
            </button>
          ) : null}
        </div>
        {focusItem && focusNode ? (
          <>
            <div className={`explore-focus-card kind-${focusItem.kind}`}>
              <span>{focusItem.kind}</span>
              <strong>{focusItem.title}</strong>
              <p>{focusItem.preview}</p>
              <small>{focusItem.date || focusItem.meta}</small>
            </div>
            <div className="explore-fan-actions">
              {modes.map((mode) => (
                <button
                  type="button"
                  key={mode.kind}
                  onClick={() => onExpand(mode.kind)}
                  disabled={candidateReady[mode.kind] && candidateCounts[mode.kind] === 0}
                  title={mode.hint}
                >
                  <span>{mode.label}</span>
                  <small>{candidateReady[mode.kind] ? candidateCounts[mode.kind] : "…"}</small>
                </button>
              ))}
            </div>
            <button type="button" className="explore-collapse" onClick={() => onCollapse(focusNode.id)}>
              Collapse unpinned branch
            </button>
          </>
        ) : (
          <p className="explore-panel-empty">Select a node to inspect and fan out.</p>
        )}
      </section>

      <p className="explore-status" aria-live="polite">{status}</p>
      <footer className="explore-panel-foot">
        Drafts stay in this browser. Content remains live from Rindle.
      </footer>
    </aside>
  );
}
