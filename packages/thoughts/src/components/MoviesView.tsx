import type { Movie } from '../types';
import { useMovies } from '../hooks/useCache';

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
        <div className="movies-grid">
          {movies.map((movie) => (
            <div key={movie.id} className="movie-card">
              <a
                className="movie-poster-link"
                href={`#thought-${movie.thought_id}`}
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
              <div className="movie-info">
                {movie.tmdb_id ? (
                  <a
                    className="movie-title"
                    href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {movie.title}
                  </a>
                ) : (
                  <span className="movie-title">{movie.title}</span>
                )}
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
                  <a
                    className="movie-reply-count"
                    href={`#thought-${movie.thought_id}`}
                  >
                    💬 {movie.reply_count}{' '}
                    {movie.reply_count === 1 ? 'reply' : 'replies'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
