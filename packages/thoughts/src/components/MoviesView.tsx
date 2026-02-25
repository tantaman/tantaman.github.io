import type { Movie } from '../types';
import { useMovies } from '../hooks/useCache';

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function MoviesView() {
  const { data } = useMovies();
  const movies: Movie[] = data?.movies ?? [];
  const loading = !data;

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
        <ul className="events-list">
          {movies.map((movie) => (
            <li key={movie.id} className="event-item">
              <span className="event-title">{movie.title}</span>
              {movie.description && (
                <span className="event-description">{movie.description}</span>
              )}
              {movie.created_at > 0 && (
                <span className="event-time">{formatDate(movie.created_at)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
