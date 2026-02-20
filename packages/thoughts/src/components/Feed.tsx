import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Thought } from '../types';
import { getThoughts } from '../api';
import { AuthContext } from '../App';
import { ThoughtCard } from './ThoughtCard';
import { ComposeForm } from './ComposeForm';

const LIMIT = 50;

export function Feed({
  tag,
  onBack,
}: {
  tag?: string;
  onBack: () => void;
}) {
  const { secret } = useContext(AuthContext);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(0);

  const load = useCallback(
    (reset?: boolean) => {
      if (loading) return;
      setLoading(true);
      const off = reset ? 0 : offsetRef.current;
      getThoughts(off, LIMIT, tag)
        .then((data) => {
          if (reset) {
            setThoughts(data.thoughts);
          } else {
            setThoughts((prev) => [...prev, ...data.thoughts]);
          }
          offsetRef.current = (reset ? 0 : offsetRef.current) + data.thoughts.length;
          setHasMore(data.meta.hasMore);
        })
        .finally(() => setLoading(false));
    },
    [tag, loading],
  );

  useEffect(() => {
    offsetRef.current = 0;
    setThoughts([]);
    setHasMore(false);
    setLoading(false);
    // Need a fresh load — can't rely on `load` since it captures stale `loading`
    getThoughts(0, LIMIT, tag).then((data) => {
      setThoughts(data.thoughts);
      offsetRef.current = data.thoughts.length;
      setHasMore(data.meta.hasMore);
    });
  }, [tag]);

  const handlePosted = (t: Thought) => {
    setThoughts((prev) => [t, ...prev]);
    offsetRef.current += 1;
  };

  const handleDelete = (id: number) => {
    setThoughts((prev) => prev.filter((t) => t.id !== id));
    offsetRef.current -= 1;
  };

  return (
    <>
      {tag && (
        <div className="thread-back">
          <a
            href="#"
            className="thread-back-link"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
          >
            &larr; Back
          </a>
          <span className="tag-view-label">#{tag}</span>
        </div>
      )}

      {!tag && secret && (
        <div className="thoughts-form-wrap">
          <ComposeForm onPosted={handlePosted} />
        </div>
      )}

      <div>
        {thoughts.map((t) => (
          <ThoughtCard
            key={t.id}
            thought={t}
            onDelete={() => handleDelete(t.id)}
            footer={
              <ThoughtFooter thought={t} secret={secret} />
            }
          />
        ))}
      </div>

      {hasMore && (
        <button
          className="load-more"
          onClick={() => load()}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      )}
    </>
  );
}

function ThoughtFooter({
  thought,
  secret,
}: {
  thought: Thought;
  secret: string | null;
}) {
  const count = thought.reply_count || 0;
  if (count > 0) {
    return (
      <div className="thought-footer">
        <a href={`#thought-${thought.id}`} className="thought-replies-link">
          {count} {count === 1 ? 'reply' : 'replies'}
        </a>
      </div>
    );
  }
  if (secret) {
    return (
      <div className="thought-footer">
        <a
          href={`#thought-${thought.id}`}
          className="thought-replies-link thought-replies-link--subtle"
        >
          Reply
        </a>
      </div>
    );
  }
  return null;
}
