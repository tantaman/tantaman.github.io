import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Movie } from '../types';
import { useMovies } from '../hooks/useCache';
import { patchMovie } from '../api';
import { AuthContext } from '../App';
import { useSWRConfig } from 'swr';

export function MoviesView() {
  const { data } = useMovies();
  const { mutate } = useSWRConfig();
  const { secret } = useContext(AuthContext);
  const movies: Movie[] = data?.movies ?? [];
  const loading = !data;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(movie: Movie) {
    setEditingId(movie.id);
    setEditValue('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function submitEdit(movie: Movie) {
    if (!secret || !editValue.trim()) return;
    setSaving(true);
    try {
      const tmdbMatch = editValue.match(/themoviedb\.org\/movie\/(\d+)/);
      const body = tmdbMatch
        ? { tmdb_id: parseInt(tmdbMatch[1], 10) }
        : { title: editValue.trim() };
      const updated = await patchMovie(movie.id, body, secret);
      mutate('movies', (prev: { movies: Movie[] } | undefined) => {
        if (!prev) return prev;
        return { movies: prev.movies.map((m) => m.id === movie.id ? { ...m, ...updated } : m) };
      }, { revalidate: false });
      setEditingId(null);
      setEditValue('');
    } catch {
      mutate('movies');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Movies</h2>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : movies.length === 0 ? (
        <div className="thought-loading">No movies yet.</div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => (
            <div key={movie.id} className="movie-card">
              {movie.tmdb_id ? (
                <a
                  className="movie-poster-link"
                  href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {movie.poster_url ? (
                    <img
                      className="movie-poster"
                      src={movie.poster_url}
                      alt={movie.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="movie-poster movie-poster--placeholder">
                      <span>{movie.title.charAt(0)}</span>
                    </div>
                  )}
                </a>
              ) : (
                <div className="movie-poster-link">
                  {movie.poster_url ? (
                    <img
                      className="movie-poster"
                      src={movie.poster_url}
                      alt={movie.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="movie-poster movie-poster--placeholder">
                      <span>{movie.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="movie-info">
                <Link
                  to="/t/$id"
                  params={{ id: String(movie.thought_id) }}
                  className="movie-title"
                >
                  {movie.title}
                  {movie.mention_count > 1 && (
                    <span className="movie-mention-count" title={`Mentioned in ${movie.mention_count} thoughts`}>
                      ×{movie.mention_count}
                    </span>
                  )}
                </Link>
                {movie.year && <span className="movie-year">{movie.year}</span>}
                {movie.vote_average != null && movie.vote_average > 0 && (
                  <span className="movie-rating">
                    {movie.vote_average.toFixed(1)}/10
                    {movie.vote_count != null && movie.vote_count > 0 && (
                      <> ({movie.vote_count.toLocaleString()} votes)</>
                    )}
                  </span>
                )}
                {movie.description && (
                  <span className="movie-description">{movie.description}</span>
                )}
                {movie.reply_count > 0 && (
                  <Link
                    to="/t/$id"
                    params={{ id: String(movie.thought_id) }}
                    className="movie-reply-count"
                  >
                    💬 {movie.reply_count}{' '}
                    {movie.reply_count === 1 ? 'reply' : 'replies'}
                  </Link>
                )}
                {secret && editingId !== movie.id && (
                  <button
                    className="movie-edit-btn"
                    onClick={() => startEdit(movie)}
                  >
                    Edit
                  </button>
                )}
                {editingId === movie.id && (
                  <form
                    className="movie-edit-form"
                    onSubmit={(e) => { e.preventDefault(); submitEdit(movie); }}
                  >
                    <input
                      className="movie-edit-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Title or TMDB URL..."
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
          ))}
        </div>
      )}
    </div>
  );
}
