export interface MovieMetadata {
  title: string;
  posterUrl: string;
  year: string;
  tmdbId: number;
  voteAverage: number;
  voteCount: number;
}

export async function lookupMovie(
  title: string,
  token: string,
): Promise<MovieMetadata | null> {
  try {
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        id: number;
        title?: string;
        poster_path: string | null;
        release_date?: string;
        vote_average?: number;
        vote_count?: number;
      }>;
    };
    const result = data.results?.[0];
    if (!result || !result.poster_path) return null;
    const posterUrl = `https://image.tmdb.org/t/p/w300${result.poster_path}`;
    const year = result.release_date ? result.release_date.slice(0, 4) : "";
    return { title: result.title ?? title, posterUrl, year, tmdbId: result.id, voteAverage: result.vote_average ?? 0, voteCount: result.vote_count ?? 0 };
  } catch {
    return null;
  }
}

export async function fetchMovieById(
  id: number,
  token: string,
): Promise<MovieMetadata | null> {
  try {
    const url = `https://api.themoviedb.org/3/movie/${id}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id: number;
      title?: string;
      poster_path: string | null;
      release_date?: string;
      vote_average?: number;
      vote_count?: number;
    };
    if (!data.poster_path) return null;
    const posterUrl = `https://image.tmdb.org/t/p/w300${data.poster_path}`;
    const year = data.release_date ? data.release_date.slice(0, 4) : "";
    return { title: data.title ?? "", posterUrl, year, tmdbId: data.id, voteAverage: data.vote_average ?? 0, voteCount: data.vote_count ?? 0 };
  } catch {
    return null;
  }
}
