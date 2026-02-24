import { useCallback, useState } from 'react';
import { useThoughts } from '../../hooks/useThoughts';
import { useSearch } from '../../hooks/useCache';
import { renderMarkdown } from '../../markdown';
import type { Thought } from '../../types';

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

function ThoughtItem({
  thought,
  placed,
}: {
  thought: Thought;
  placed: boolean;
}) {
  const html = renderMarkdown(truncate(thought.body, 200));
  return (
    <div
      className={`framing-panel-thought${placed ? ' placed' : ''}`}
      draggable={!placed}
      onDragStart={(e) => {
        if (placed) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/thought-id', String(thought.id));
        e.dataTransfer.setData('application/thought-body', thought.body);
        e.dataTransfer.setData(
          'application/thought-timestamp',
          String(thought.timestamp),
        );
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div
        className="thought-body thought-body--md framing-panel-thought-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function SearchResults({
  query,
  placedIds,
}: {
  query: string;
  placedIds: Set<number>;
}) {
  const { data, isLoading } = useSearch(query);
  if (isLoading) return <div className="framing-panel-status">Searching…</div>;
  if (!data || data.thoughts.length === 0)
    return <div className="framing-panel-status">No results</div>;
  return (
    <div className="framing-panel-list">
      {data.thoughts.map((t) => (
        <ThoughtItem key={t.id} thought={t} placed={placedIds.has(t.id)} />
      ))}
    </div>
  );
}

function FeedResults({
  placedIds,
}: {
  placedIds: Set<number>;
}) {
  const { thoughts, hasMore, isLoadingInitial, isLoadingMore, loadMore } =
    useThoughts([]);

  if (isLoadingInitial) return <div className="framing-panel-status">Loading…</div>;

  return (
    <div className="framing-panel-list">
      {thoughts.map((t) => (
        <ThoughtItem key={t.id} thought={t} placed={placedIds.has(t.id)} />
      ))}
      {hasMore && (
        <button
          className="framing-panel-load-more"
          onClick={loadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}

export function FramingLeftPanel({
  framingName,
  placedThoughtIds,
}: {
  framingName: string;
  placedThoughtIds: Set<number>;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDebouncedQuery(value), 300);
    },
    [],
  );

  return (
    <div className="framing-left-panel">
      <div className="framing-panel-header">
        <a href="#framings" className="framing-panel-back">&larr; Framings</a>
        <h3 className="framing-panel-title">{framingName}</h3>
      </div>
      <div className="framing-panel-search">
        <input
          type="text"
          className="framing-panel-search-input"
          placeholder="Search thoughts…"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
        />
        {query && (
          <button
            className="framing-panel-search-clear"
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
          >
            ×
          </button>
        )}
      </div>
      {debouncedQuery ? (
        <SearchResults query={debouncedQuery} placedIds={placedThoughtIds} />
      ) : (
        <FeedResults placedIds={placedThoughtIds} />
      )}
    </div>
  );
}
