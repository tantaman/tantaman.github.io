import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Album } from '../types';
import { useAlbums } from '../hooks/useCache';
import { patchAlbum } from '../api';
import { AuthContext } from '../App';
import { useSWRConfig } from 'swr';

const ITUNES_ID_PATTERNS = [
  /music\.apple\.com\/[^/]+\/album\/[^/]+\/(\d+)/i,
  /itunes\.apple\.com\/[^/]+\/album\/[^/]+\/id(\d+)/i,
  /\/album\/(?:[^/]+\/)?id?(\d+)/i,
];

function parseItunesId(value: string): number | null {
  for (const re of ITUNES_ID_PATTERNS) {
    const m = value.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export function MusicView() {
  const { data } = useAlbums();
  const { mutate } = useSWRConfig();
  const { secret } = useContext(AuthContext);
  const albums: Album[] = data?.albums ?? [];
  const loading = !data;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(album: Album) {
    setEditingId(album.id);
    setEditValue('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function submitEdit(album: Album) {
    if (!secret || !editValue.trim()) return;
    setSaving(true);
    try {
      const itunesId = parseItunesId(editValue);
      const body = itunesId != null
        ? { itunes_id: itunesId }
        : { title: editValue.trim() };
      const updated = await patchAlbum(album.id, body, secret);
      mutate('albums', (prev: { albums: Album[] } | undefined) => {
        if (!prev) return prev;
        return { albums: prev.albums.map((a) => a.id === album.id ? { ...a, ...updated } : a) };
      }, { revalidate: false });
      setEditingId(null);
      setEditValue('');
    } catch {
      mutate('albums');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Music</h2>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : albums.length === 0 ? (
        <div className="thought-loading">No albums yet.</div>
      ) : (
        <div className="movies-grid music-grid">
          {albums.map((album) => {
            const externalUrl = album.itunes_id
              ? `https://music.apple.com/album/${album.itunes_id}`
              : null;
            const cover = album.cover_url ? (
              <img
                className="movie-poster album-cover"
                src={album.cover_url}
                alt={album.title}
                loading="lazy"
              />
            ) : (
              <div className="movie-poster movie-poster--placeholder album-cover">
                <span>{album.title.charAt(0)}</span>
              </div>
            );
            return (
              <div key={album.id} className="movie-card">
                {externalUrl ? (
                  <a
                    className="movie-poster-link"
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {cover}
                  </a>
                ) : (
                  <div className="movie-poster-link">{cover}</div>
                )}
                <div className="movie-info">
                  <Link
                    to="/t/$id"
                    params={{ id: album.thought_id }}
                    className="movie-title"
                  >
                    {album.title}
                    {album.mention_count > 1 && (
                      <span className="movie-mention-count" title={`Mentioned in ${album.mention_count} thoughts`}>
                        ×{album.mention_count}
                      </span>
                    )}
                  </Link>
                  {album.artist && <span className="movie-year">{album.artist}</span>}
                  {album.year && <span className="movie-year">{album.year}</span>}
                  {album.genre && <span className="movie-year">{album.genre}</span>}
                  {album.description && (
                    <span className="movie-description">{album.description}</span>
                  )}
                  {album.reply_count > 0 && (
                    <Link
                      to="/t/$id"
                      params={{ id: album.thought_id }}
                      className="movie-reply-count"
                    >
                      💬 {album.reply_count}{' '}
                      {album.reply_count === 1 ? 'reply' : 'replies'}
                    </Link>
                  )}
                  {secret && editingId !== album.id && (
                    <button
                      className="movie-edit-btn"
                      onClick={() => startEdit(album)}
                    >
                      Edit
                    </button>
                  )}
                  {editingId === album.id && (
                    <form
                      className="movie-edit-form"
                      onSubmit={(e) => { e.preventDefault(); submitEdit(album); }}
                    >
                      <input
                        className="movie-edit-input"
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Title or Apple Music URL..."
                        disabled={saving}
                        autoFocus
                      />
                      <div className="movie-edit-actions">
                        <button type="submit" className="movie-edit-save" disabled={saving || !editValue.trim()}>
                          {saving ? '...' : 'Save'}
                        </button>
                        <button type="button" className="movie-edit-cancel" onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
