import type { Bookmark } from '../types';
import { useBookmarks } from '../hooks/useCache';

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function BookmarksView() {
  const { data } = useBookmarks();
  const bookmarks: Bookmark[] = data?.bookmarks ?? [];
  const loading = !data;

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
        <ul className="events-list">
          {bookmarks.map((bm) => (
            <li key={bm.id} className="event-item">
              <a href={bm.url} target="_blank" rel="noopener noreferrer" className="event-title">
                {bm.title || bm.url}
              </a>
              <span className="event-description">{getDomain(bm.url)}</span>
              <span className="event-time">
                {formatDate(bm.created_at)}
                {bm.thought_count > 1 && ` · referenced by ${bm.thought_count} thoughts`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
