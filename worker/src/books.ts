import { EVENT_RE } from "./events";
import { LOCATION_RE } from "./locations";

export interface BookDef {
  title: string;
  description: string | null;
}

export const BOOK_RE = /^#b\s+(.+)/i;

export function extractBooks(body: string): BookDef[] {
  const lines = body.split('\n');
  const books: BookDef[] = [];
  let current: BookDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(BOOK_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        books.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE) || line.match(/^#[tlmq]\s+/) || line.match(LOCATION_RE)) {
        current.description = descLines.join('\n').trim() || null;
        books.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    books.push(current);
  }

  return books;
}
