import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThoughts } from '../../hooks/useThoughts';
import { useSearch, usePostsManifest } from '../../hooks/useCache';
import { renderMarkdown } from '../../markdown';
import type { Thought, PostSummary } from '../../types';

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
      style={thought.color ? { backgroundColor: thought.color + '14' } : undefined}
      draggable={!placed}
      onDragStart={(e) => {
        if (placed) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/node-type', 'thought');
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

function PostItem({
  post,
  placed,
}: {
  post: PostSummary;
  placed: boolean;
}) {
  return (
    <div
      className={`framing-panel-post${placed ? ' placed' : ''}`}
      style={post.color ? { borderLeftColor: post.color } : undefined}
      draggable={!placed}
      onDragStart={(e) => {
        if (placed) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/node-type', 'post');
        e.dataTransfer.setData('application/item-id', post.slug);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className="framing-panel-post-title">{post.title}</div>
      {post.date && <div className="framing-panel-post-date">{post.date}</div>}
      {post.summary && (
        <div className="framing-panel-post-summary">{truncate(post.summary, 120)}</div>
      )}
    </div>
  );
}

function SearchResults({
  query,
  placedKeys,
}: {
  query: string;
  placedKeys: Set<string>;
}) {
  const { data, isLoading } = useSearch(query);
  if (isLoading) return <div className="framing-panel-status">Searching…</div>;
  if (!data || data.thoughts.length === 0)
    return <div className="framing-panel-status">No results</div>;
  return (
    <div className="framing-panel-list">
      {data.thoughts.map((t) => (
        <ThoughtItem key={t.id} thought={t} placed={placedKeys.has(`thought:${t.id}`)} />
      ))}
    </div>
  );
}

function FeedResults({
  placedKeys,
}: {
  placedKeys: Set<string>;
}) {
  const { thoughts, hasMore, isLoadingInitial, isLoadingMore, loadMore } =
    useThoughts([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        loadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  if (isLoadingInitial) return <div className="framing-panel-status">Loading…</div>;

  return (
    <div className="framing-panel-list">
      {thoughts.map((t) => (
        <ThoughtItem key={t.id} thought={t} placed={placedKeys.has(`thought:${t.id}`)} />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="framing-panel-status">
          {isLoadingMore ? 'Loading…' : ''}
        </div>
      )}
    </div>
  );
}

function PostsResults({
  placedKeys,
  filter,
}: {
  placedKeys: Set<string>;
  filter: string;
}) {
  const { data, isLoading } = usePostsManifest();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!filter) return data;
    const lower = filter.toLowerCase();
    return data.filter((p) => p.title.toLowerCase().includes(lower));
  }, [data, filter]);

  if (isLoading) return <div className="framing-panel-status">Loading…</div>;
  if (filtered.length === 0)
    return <div className="framing-panel-status">No posts found</div>;

  return (
    <div className="framing-panel-list">
      {filtered.map((p) => (
        <PostItem key={p.slug} post={p} placed={placedKeys.has(`post:${p.slug}`)} />
      ))}
    </div>
  );
}

export function FramingLeftPanel({
  framingName,
  placedItemKeys,
}: {
  framingName: string;
  placedItemKeys: Set<string>;
}) {
  const [tab, setTab] = useState<'thoughts' | 'posts'>('thoughts');
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
      <div className="framing-panel-tabs">
        <button
          className={`framing-panel-tab${tab === 'thoughts' ? ' active' : ''}`}
          onClick={() => { setTab('thoughts'); setQuery(''); setDebouncedQuery(''); }}
        >
          Thoughts
        </button>
        <button
          className={`framing-panel-tab${tab === 'posts' ? ' active' : ''}`}
          onClick={() => { setTab('posts'); setQuery(''); setDebouncedQuery(''); }}
        >
          Posts
        </button>
      </div>
      <div className="framing-panel-search">
        <input
          type="text"
          className="framing-panel-search-input"
          placeholder={tab === 'thoughts' ? 'Search thoughts…' : 'Filter posts…'}
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
      {tab === 'thoughts' ? (
        debouncedQuery ? (
          <SearchResults query={debouncedQuery} placedKeys={placedItemKeys} />
        ) : (
          <FeedResults placedKeys={placedItemKeys} />
        )
      ) : (
        <PostsResults placedKeys={placedItemKeys} filter={debouncedQuery} />
      )}
    </div>
  );
}
