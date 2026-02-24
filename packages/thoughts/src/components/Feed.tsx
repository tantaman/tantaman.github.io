import { useContext, useState, useCallback } from 'react';
import type { Thought } from '../types';
import { AuthContext } from '../App';
import { useThoughts } from '../hooks/useThoughts';
import { useSearch } from '../hooks/useCache';
import { ThoughtCard } from './ThoughtCard';
import { ComposeForm } from './ComposeForm';
import { SearchBar } from './SearchBar';

export function Feed({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);
  const { thoughts, hasMore, isLoadingInitial, isLoadingMore, loadMore, mutate } =
    useThoughts(tags, secret);

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

  const isSearching = searchQuery.length > 0;

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      {!isSearching && secret && (
        <div className="thoughts-form-wrap">
          <ComposeForm onPosted={handlePosted} />
        </div>
      )}

      {isSearching ? (
        <SearchResults query={searchQuery} secret={secret} />
      ) : (
        <>
          <div>
            {thoughts.map((t) => (
              <ThoughtCard
                key={t.id}
                thought={t}
                maxBodyChars={1000}
                readMore={
                  <a href={`#thought-${t.id}`} className="thought-read-more">read more</a>
                }
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
      )}
    </>
  );
}

function SearchResults({ query, secret }: { query: string; secret: string | null }) {
  const { data, isLoading } = useSearch(query, secret);

  if (isLoading) {
    return <div className="thought-loading">Searching...</div>;
  }

  if (!data || data.thoughts.length === 0) {
    return <div className="thought-loading">No results found</div>;
  }

  return (
    <div>
      {data.thoughts.map((t) => (
        <ThoughtCard
          key={t.id}
          thought={t}
          maxBodyChars={1000}
          readMore={
            <a href={`#thought-${t.id}`} className="thought-read-more">read more</a>
          }
          footer={
            <SearchFooter score={t.score} thoughtId={t.id} replyCount={t.reply_count} />
          }
        />
      ))}
    </div>
  );
}

function SearchFooter({
  score,
  thoughtId,
  replyCount,
}: {
  score: number;
  thoughtId: number;
  replyCount: number;
}) {
  const pct = Math.round(score * 100);
  return (
    <div className="thought-footer">
      <span className="search-score">{pct}% match</span>
      {replyCount > 0 && (
        <a href={`#thought-${thoughtId}`} className="thought-replies-link">
          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </a>
      )}
    </div>
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
