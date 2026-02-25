import { EVENT_RE } from "./events";

export interface LocationDef {
  title: string;
  description: string | null;
}

export async function geocodeLocation(
  title: string,
  mapboxToken: string,
): Promise<{ lat: number; lng: number; resolvedName: string } | null> {
  try {
    const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(title)}&access_token=${mapboxToken}&limit=1&types=poi,address,place`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: { full_address?: string; name?: string };
      }>;
    };
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    const resolvedName = feature.properties.full_address || feature.properties.name || title;
    return { lat, lng, resolvedName };
  } catch {
    return null;
  }
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
