import { EVENT_RE } from "./events";
import { LOCATION_RE } from "./locations";

export interface AlbumDef {
  title: string;
  description: string | null;
}

export const ALBUM_RE = /^#a\s+(.+)/i;

export function normalizeAlbumTitle(title: string): string {
  return title.toLowerCase().trim();
}

export function extractAlbums(body: string): AlbumDef[] {
  const lines = body.split('\n');
  const albums: AlbumDef[] = [];
  let current: AlbumDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(ALBUM_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        albums.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE) || line.match(/^#[tlmbq]\s+/) || line.match(LOCATION_RE)) {
        current.description = descLines.join('\n').trim() || null;
        albums.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    albums.push(current);
  }

  return albums;
}
