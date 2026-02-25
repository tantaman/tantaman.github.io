import { EVENT_RE } from "./events";

export interface LocationDef {
  title: string;
  description: string | null;
}

export const LOCATION_RE = /^#l\s+(.+)/i;

export function extractLocations(body: string): LocationDef[] {
  const lines = body.split('\n');
  const locations: LocationDef[] = [];
  let current: LocationDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(LOCATION_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        locations.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE) || line.match(/^#t\s+/)) {
        current.description = descLines.join('\n').trim() || null;
        locations.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    locations.push(current);
  }

  return locations;
}
