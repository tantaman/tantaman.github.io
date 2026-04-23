import { useContext, useState, useCallback } from 'react';
import type { Thought, PasteSearchResult, AmplificationSearchResult } from '../types';
import { AuthContext } from '../App';
import { useThoughts } from '../hooks/useThoughts';
import { useSearch } from '../hooks/useCache';
import { ThoughtCard } from './ThoughtCard';
import { ComposeForm } from './ComposeForm';
import { SearchBar } from './SearchBar';

export function Feed({ tags, framing }: { tags: string[]; framing?: number | null }) {
  const { secret } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);
  const { thoughts, hasMore, isLoadingInitial, isLoadingMore, loadMore, mutate } =
    useThoughts(tags, secret, framing);

  const handlePosted = (t: Thought) => {
    mutate(
      (pages) => {
        if (!pages || pages.length === 0) return pages;
        const firstPage = pages[0];
        return [
          { ...firstPage, thoughts: [t, ...firstPage.thoughts] },
          ...pages.slice(1),
        ];
      },
      false,
    );
  };

  const handleEdited = (t: Thought) => {
    mutate(
      (pages) => {
        if (!pages || pages.length === 0) return pages;
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
                onEdited={secret ? handleEdited : undefined}
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

  const thoughts = data?.thoughts ?? [];
  const pastes = data?.pastes ?? [];
  const amps = data?.amplifications ?? [];

  if (thoughts.length === 0 && pastes.length === 0 && amps.length === 0) {
    return <div className="thought-loading">No results found</div>;
  }

  return (
    <div>
      {thoughts.length > 0 && (
        <>
          <h3 className="search-section-title">Thoughts</h3>
          {thoughts.map((t) => (
            <ThoughtCard
              key={t.id}
              thought={t}
              maxBodyChars={1000}
              readMore={<a href={`#thought-${t.id}`} className="thought-read-more">read more</a>}
              footer={<SearchFooter score={t.score} thoughtId={t.id} replyCount={t.reply_count} />}
            />
          ))}
        </>
      )}
      {pastes.length > 0 && (
        <>
          <h3 className="search-section-title">Pastes</h3>
          {pastes.map((p) => <PasteResultCard key={p.id} paste={p} />)}
        </>
      )}
      {amps.length > 0 && (
        <>
          <h3 className="search-section-title">Amplifications</h3>
          {amps.map((a) => <AmpResultCard key={a.id} amp={a} />)}
        </>
      )}
    </div>
  );
}

function PasteResultCard({ paste }: { paste: PasteSearchResult }) {
  const pct = Math.round(paste.score * 100);
  return (
    <a className="search-paste-card" href={`/paste/${paste.id}`} target="_blank" rel="noopener noreferrer">
      <div className="search-paste-head">
        <span className="search-paste-title">{paste.title || 'Untitled'}</span>
        <span className="search-paste-lang">{paste.language}</span>
      </div>
      <pre className="search-paste-body">{paste.body_preview}</pre>
      <div className="thought-footer">
        <span className="search-score">{pct}% match</span>
        {!paste.shared && <span className="search-paste-private">private</span>}
      </div>
    </a>
  );
}

function AmpResultCard({ amp }: { amp: AmplificationSearchResult }) {
  const pct = Math.round(amp.score * 100);
  let domain = '';
  try { domain = new URL(amp.url).hostname.replace(/^www\./, ''); } catch { domain = amp.url; }
  return (
    <a className="search-amp-card" href={amp.url} target="_blank" rel="noopener noreferrer">
      {amp.image_url && <img className="search-amp-image" src={amp.image_url} alt="" loading="lazy" />}
      <div className="search-amp-body">
        <div className="search-amp-head">
          <span className="search-amp-title">{amp.title || domain}</span>
          <span className="amplification-source">{amp.source}</span>
        </div>
        {amp.note && <div className="amplification-note">{amp.note}</div>}
        {amp.description && <div className="bookmark-desc">{amp.description}</div>}
        <div className="thought-footer">
          <span className="search-score">{pct}% match</span>
          <span className="bookmark-domain">{domain}</span>
        </div>
      </div>
    </a>
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
