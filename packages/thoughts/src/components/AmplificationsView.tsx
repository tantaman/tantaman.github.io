import { useContext, useState } from 'react';
import type { Amplification } from '../types';
import { useAmplifications } from '../hooks/useCache';
import { deleteAmplification, refetchAmplification } from '../api';
import { AuthContext } from '../App';
import { useSWRConfig } from 'swr';

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const SOURCE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'substack', label: 'Substack' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'mastodon', label: 'Mastodon' },
  { value: 'other', label: 'Other' },
];

function titleFallback(a: Amplification): string {
  if (a.title) return a.title;
  if (a.source === 'substack') return 'Untitled Substack note';
  try {
    return new URL(a.url).hostname.replace(/^www\./, '');
  } catch {
    return a.url;
  }
}

export function AmplificationsView() {
  const [source, setSource] = useState<string>('');
  const { data } = useAmplifications(source || undefined);
  const { mutate } = useSWRConfig();
  const { secret } = useContext(AuthContext);
  const [busyId, setBusyId] = useState<number | null>(null);

  const amps: Amplification[] = data?.amplifications ?? [];
  const loading = !data;

  async function remove(id: number) {
    if (!secret) return;
    if (!confirm('Remove this amplification?')) return;
    await deleteAmplification(id, secret);
    mutate('amplifications');
    mutate(`amplifications-${source}`);
  }

  async function refetch(a: Amplification) {
    if (!secret) return;
    setBusyId(a.id);
    try {
      const updated = await refetchAmplification(a.id, secret);
      const replace = (prev: { amplifications: Amplification[]; meta: { hasMore: boolean } } | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          amplifications: prev.amplifications.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
        };
      };
      mutate('amplifications', replace, { revalidate: false });
      mutate(`amplifications-${source}`, replace, { revalidate: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refetch failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Amplifications</h2>
        <a className="capture-link-btn" href="#capture">Capture new</a>
      </div>
      <div className="amplification-filters">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            className={`amplification-filter${source === f.value ? ' active' : ''}`}
            onClick={() => setSource(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : amps.length === 0 ? (
        <div className="thought-loading">No amplifications yet. Use the bookmarklet or the share sheet.</div>
      ) : (
        <div className="bookmarks-grid">
          {amps.map((a) => (
            <a
              key={a.id}
              className="bookmark-card"
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.image_url ? (
                <img className="bookmark-image" src={a.image_url} alt="" loading="lazy" />
              ) : (
                <div className="bookmark-image bookmark-image--placeholder">
                  <span>{getDomain(a.url)}</span>
                </div>
              )}
              <div className="bookmark-info">
                <span className="bookmark-title">{titleFallback(a)}</span>
                <span className="amplification-source">{a.source}</span>
                {a.note && <span className="amplification-note">{a.note}</span>}
                {a.description && <span className="bookmark-desc">{a.description}</span>}
                <span className="bookmark-domain">{getDomain(a.url)}</span>
              </div>
              {secret && (
                <div className="amplification-actions">
                  <button
                    className="bookmark-refetch"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      refetch(a);
                    }}
                    disabled={busyId === a.id}
                  >
                    {busyId === a.id ? '...' : 'Refetch'}
                  </button>
                  <button
                    className="bookmark-refetch"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(a.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
