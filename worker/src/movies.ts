import { EVENT_RE } from "./events";
import { LOCATION_RE } from "./locations";

export interface MovieDef {
  title: string;
  description: string | null;
}

export const MOVIE_RE = /^#m\s+(.+)/i;

export function extractMovies(body: string): MovieDef[] {
  const lines = body.split('\n');
  const movies: MovieDef[] = [];
  let current: MovieDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(MOVIE_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        movies.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE) || line.match(/^#[tlbq]\s+/) || line.match(LOCATION_RE)) {
        current.description = descLines.join('\n').trim() || null;
        movies.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    movies.push(current);
  }

  return movies;
}
