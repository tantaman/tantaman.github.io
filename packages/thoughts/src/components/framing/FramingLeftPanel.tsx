import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useThoughts } from '../../hooks/useThoughts';
import { useSearch, usePostsManifest, useDocuments, useFramings } from '../../hooks/useCache';
import { renderMarkdown } from '../../markdown';
import { AuthContext } from '../../App';
import type { Thought, PostSummary, DocumentSummary, Framing } from '../../types';

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
      {post.description && (
        <div className="framing-panel-post-summary">{truncate(post.description, 120)}</div>
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

function DocumentItem({
  doc,
  placed,
}: {
  doc: DocumentSummary;
  placed: boolean;
}) {
  return (
    <div
      className={`framing-panel-document${placed ? ' placed' : ''}`}
      draggable={!placed}
      onDragStart={(e) => {
        if (placed) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/node-type', 'document');
        e.dataTransfer.setData('application/item-id', String(doc.id));
        e.dataTransfer.setData('application/document-title', doc.title);
        e.dataTransfer.setData('application/document-body', '');
        e.dataTransfer.setData('application/document-updated', String(doc.updated_at));
        e.dataTransfer.setData('application/document-private', doc.private ? '1' : '0');
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className="framing-panel-document-title">
        {doc.title || 'Untitled'}
        {doc.private && <span className="framing-panel-document-private" title="Private">·</span>}
      </div>
    </div>
  );
}

function DocumentsResults({
  placedKeys,
  filter,
}: {
  placedKeys: Set<string>;
  filter: string;
}) {
  const { secret } = useContext(AuthContext);
  const { data, isLoading } = useDocuments(secret);
  const documents = data?.documents ?? [];

  const filtered = useMemo(() => {
    if (!filter) return documents;
    const lower = filter.toLowerCase();
    return documents.filter((d) => d.title.toLowerCase().includes(lower));
  }, [documents, filter]);

  if (isLoading) return <div className="framing-panel-status">Loading…</div>;
  if (filtered.length === 0)
    return <div className="framing-panel-status">No documents found</div>;

  return (
    <div className="framing-panel-list">
      {filtered.map((d) => (
        <DocumentItem key={d.id} doc={d} placed={placedKeys.has(`document:${d.id}`)} />
      ))}
    </div>
  );
}

function FramingItem({
  framing,
  placed,
}: {
  framing: Framing;
  placed: boolean;
}) {
  return (
    <div
      className={`framing-panel-framing${placed ? ' placed' : ''}`}
      draggable={!placed}
      onDragStart={(e) => {
        if (placed) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('application/node-type', 'framing');
        e.dataTransfer.setData('application/item-id', String(framing.id));
        e.dataTransfer.setData('application/framing-title', framing.name);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className="framing-panel-framing-title">{framing.name || 'Untitled'}</div>
    </div>
  );
}

function FramingsResults({
  placedKeys,
  filter,
  currentFramingId,
}: {
  placedKeys: Set<string>;
  filter: string;
  currentFramingId: number;
}) {
  const { data, isLoading } = useFramings();

  const filtered = useMemo(() => {
    const all = (data?.framings ?? []).filter((f) => f.id !== currentFramingId);
    if (!filter) return all;
    const lower = filter.toLowerCase();
    return all.filter((f) => f.name.toLowerCase().includes(lower));
  }, [data, filter, currentFramingId]);

  if (isLoading) return <div className="framing-panel-status">Loading…</div>;
  if (filtered.length === 0)
    return <div className="framing-panel-status">No framings found</div>;

  return (
    <div className="framing-panel-list">
      {filtered.map((f) => (
        <FramingItem key={f.id} framing={f} placed={placedKeys.has(`framing:${f.id}`)} />
      ))}
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
  framingId,
  framingName,
  placedItemKeys,
  onRename,
}: {
  framingId: number;
  framingName: string;
  placedItemKeys: Set<string>;
  onRename?: (name: string) => void;
}) {
  const { secret } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(framingName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== framingName && onRename) {
      onRename(trimmed);
    } else {
      setEditValue(framingName);
    }
  }, [editValue, framingName, onRename]);

  const [tab, setTab] = useState<'thoughts' | 'posts' | 'documents' | 'framings'>('thoughts');
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
        <Link to="/framings" className="framing-panel-back">&larr; Framings</Link>
        {editing ? (
          <input
            ref={inputRef}
            className="framing-panel-title-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') { setEditing(false); setEditValue(framingName); }
            }}
            onBlur={commitEdit}
          />
        ) : (
          <h3
            className={`framing-panel-title${secret ? ' editable' : ''}`}
            onDoubleClick={() => {
              if (!secret) return;
              setEditValue(framingName);
              setEditing(true);
            }}
          >
            {framingName}
          </h3>
        )}
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
        <button
          className={`framing-panel-tab${tab === 'documents' ? ' active' : ''}`}
          onClick={() => { setTab('documents'); setQuery(''); setDebouncedQuery(''); }}
        >
          Docs
        </button>
        <button
          className={`framing-panel-tab${tab === 'framings' ? ' active' : ''}`}
          onClick={() => { setTab('framings'); setQuery(''); setDebouncedQuery(''); }}
        >
          Framings
        </button>
      </div>
      <div className="framing-panel-search">
        <input
          type="text"
          className="framing-panel-search-input"
          placeholder={
            tab === 'thoughts'
              ? 'Search thoughts…'
              : tab === 'posts'
              ? 'Filter posts…'
              : tab === 'documents'
              ? 'Filter documents…'
              : 'Filter framings…'
          }
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
      ) : tab === 'posts' ? (
        <PostsResults placedKeys={placedItemKeys} filter={debouncedQuery} />
      ) : tab === 'documents' ? (
        <DocumentsResults placedKeys={placedItemKeys} filter={debouncedQuery} />
      ) : (
        <FramingsResults
          placedKeys={placedItemKeys}
          filter={debouncedQuery}
          currentFramingId={framingId}
        />
      )}
    </div>
  );
}
