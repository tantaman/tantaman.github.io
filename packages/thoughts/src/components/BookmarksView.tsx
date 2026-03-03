import { useContext, useState } from 'react';
import type { Bookmark } from '../types';
import { useBookmarks } from '../hooks/useCache';
import { patchBookmark } from '../api';
import { AuthContext } from '../App';
import { useSWRConfig } from 'swr';

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function BookmarksView() {
  const { data } = useBookmarks();
  const { mutate } = useSWRConfig();
  const { secret } = useContext(AuthContext);
  const bookmarks: Bookmark[] = data?.bookmarks ?? [];
  const loading = !data;

  const [refetchingId, setRefetchingId] = useState<number | null>(null);

  async function refetch(bm: Bookmark) {
    if (!secret) return;
    setRefetchingId(bm.id);
    try {
      const updated = await patchBookmark(bm.id, secret);
      mutate('bookmarks', (prev: { bookmarks: Bookmark[] } | undefined) => {
        if (!prev) return prev;
        return { bookmarks: prev.bookmarks.map((b) => b.id === bm.id ? { ...b, ...updated } : b) };
      }, { revalidate: false });
    } catch {
      mutate('bookmarks');
    } finally {
      setRefetchingId(null);
    }
  }

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Bookmarks</h2>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : bookmarks.length === 0 ? (
        <div className="thought-loading">No bookmarks yet.</div>
      ) : (
        <div className="bookmarks-grid">
          {bookmarks.map((bm) => (
            <a
              key={bm.id}
              className="bookmark-card"
              href={bm.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {bm.image_url ? (
                <img
                  className="bookmark-image"
                  src={bm.image_url}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="bookmark-image bookmark-image--placeholder">
                  <span>{getDomain(bm.url)}</span>
                </div>
              )}
              <div className="bookmark-info">
                <span className="bookmark-title">
                  {bm.title || getDomain(bm.url)}
                </span>
                {bm.site_name && (
                  <span className="bookmark-site">{bm.site_name}</span>
                )}
                {bm.description && (
                  <span className="bookmark-desc">{bm.description}</span>
                )}
                <span className="bookmark-domain">{getDomain(bm.url)}</span>
              </div>
              {secret && (
                <button
                  className="bookmark-refetch"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refetch(bm);
                  }}
                  disabled={refetchingId === bm.id}
                >
                  {refetchingId === bm.id ? '...' : 'Refetch'}
                </button>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
