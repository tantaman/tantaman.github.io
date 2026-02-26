export interface MovieMetadata {
  posterUrl: string;
  year: string;
  tmdbId: number;
}

export async function lookupMovie(
  title: string,
  apiKey: string,
): Promise<MovieMetadata | null> {
  try {
    const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        id: number;
        poster_path: string | null;
        release_date?: string;
      }>;
    };
    const result = data.results?.[0];
    if (!result || !result.poster_path) return null;
    const posterUrl = `https://image.tmdb.org/t/p/w300${result.poster_path}`;
    const year = result.release_date ? result.release_date.slice(0, 4) : "";
    return { posterUrl, year, tmdbId: result.id };
  } catch {
    return null;
  }
}
