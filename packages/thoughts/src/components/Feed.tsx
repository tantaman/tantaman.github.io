import { useContext, useState, useCallback } from 'react';
import type { Thought } from '../types';
import { AuthContext } from '../App';
import { useThoughts } from '../hooks/useThoughts';
import { useSearch } from '../hooks/useCache';
import { ThoughtCard } from './ThoughtCard';
import { ComposeForm } from './ComposeForm';
import { SearchBar } from './SearchBar';

export function Feed({ tags, framing }: { tags: string[]; framing?: number | null }) {
  const { secret } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);
  const { thoughts, hasMore, isLoadingInitial, isLoadingMore, loadMore, mutate } =
    useThoughts(tags, secret, framing);

  const handlePosted = (t: Thought) => {
    setEditingThought(null);
    mutate(
      (pages) => {
        if (!pages || pages.length === 0) return pages;
        const first = pages[0];
        // If this is a version, remove the superseded thought
        const supersededId = t.version_of;
        const filtered = supersededId != null
          ? pages.map((page) => ({
              ...page,
              thoughts: page.thoughts.filter((th) => th.id !== supersededId && th.version_of !== supersededId),
            }))
          : pages;
        const firstPage = filtered[0];
        return [
          { ...firstPage, thoughts: [t, ...firstPage.thoughts] },
          ...filtered.slice(1),
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

  const handleEdit = useCallback((thought: Thought) => {
    setEditingThought(thought);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isSearching = searchQuery.length > 0;

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      {!isSearching && secret && (
        <div className="thoughts-form-wrap">
          {editingThought ? (
            <ComposeForm
              versionOf={editingThought.id}
              initialBody={editingThought.body}
              submitLabel="Save revision"
              onPosted={handlePosted}
              onCancel={() => setEditingThought(null)}
            />
          ) : (
            <ComposeForm onPosted={handlePosted} />
          )}
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
                onEdit={secret ? handleEdit : undefined}
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
