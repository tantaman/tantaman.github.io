import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMedia } from '../hooks/useCache';
import { attachmentUrl } from '../api';
import { AuthContext } from '../App';
import type { MediaItem } from '../types';

function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Lightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div className="media-lightbox" onClick={onClose}>
      <div className="media-lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="media-lightbox-close" onClick={onClose}>&times;</button>
        <img src={attachmentUrl(item.key)} alt={item.name} />
        <div className="media-lightbox-caption">
          <Link to="/t/$id" params={{ id: item.thought_id }} className="media-lightbox-link">
            {formatDate(item.timestamp)}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MediaView() {
  const { secret } = useContext(AuthContext);
  const { media, hasMore, loading, loadMore } = useMedia(secret);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  return (
    <div className="media-view">
      <div className="events-header">
        <h2 className="events-title">Media</h2>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : media.length === 0 ? (
        <div className="thought-loading">No media yet.</div>
      ) : (
        <>
          <div className="media-grid">
            {media.map((item) => (
              <div
                key={item.key}
                className="media-grid-item"
                style={item.color ? { borderColor: item.color + '40' } : undefined}
                onClick={() => setSelected(item)}
              >
                <img src={attachmentUrl(item.key)} alt={item.name} loading="lazy" />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="thought-load-more-wrap">
              <button className="thought-load-more" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}
        </>
      )}
      {selected && <Lightbox item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
