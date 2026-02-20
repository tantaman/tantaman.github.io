import { useContext } from 'react';
import type { Thought } from '../types';
import { AuthContext } from '../App';
import { useThoughts } from '../hooks/useThoughts';
import { ThoughtCard } from './ThoughtCard';
import { ComposeForm } from './ComposeForm';

export function Feed({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const { thoughts, hasMore, isLoadingInitial, isLoadingMore, loadMore, mutate } =
    useThoughts(tags);

  const handlePosted = (t: Thought) => {
    mutate(
      (pages) => {
        if (!pages || pages.length === 0) return pages;
        const first = pages[0];
        return [
          { ...first, thoughts: [t, ...first.thoughts] },
          ...pages.slice(1),
        ];
      },
      false,
    );
  };

  const handleDelete = (id: number) => {
    mutate(
      (pages) => {
        if (!pages) return pages;
        return pages.map((page) => ({
          ...page,
          thoughts: page.thoughts.filter((t) => t.id !== id),
        }));
      },
      false,
    );
  };

  return (
    <>
      {secret && (
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

      {isLoadingInitial && (
        <div className="thought-loading">Loading...</div>
      )}

      {hasMore && !isLoadingInitial && (
        <button
          className="load-more"
          onClick={loadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
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
