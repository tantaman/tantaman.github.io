import { EVENT_RE } from "./events";

export interface LocationDef {
  title: string;
  description: string | null;
}

export async function geocodeLocation(
  title: string,
  mapboxToken: string,
): Promise<{ lat: number; lng: number; resolvedName: string } | null> {
  if (!mapboxToken) {
    console.warn(`[geocode] MAPBOX_TOKEN not set; skipping "${title}"`);
    return null;
  }
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(title)}&access_token=${mapboxToken}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable>");
      console.warn(`[geocode] Mapbox ${res.status} for "${title}": ${body.slice(0, 300)}`);
      return null;
    }
    const data = await res.json() as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: { full_address?: string; name?: string; place_formatted?: string };
      }>;
    };
    const feature = data.features?.[0];
    if (!feature) {
      console.warn(`[geocode] No feature for "${title}"`);
      return null;
    }
    const [lng, lat] = feature.geometry.coordinates;
    const resolvedName =
      feature.properties.full_address ||
      feature.properties.place_formatted ||
      feature.properties.name ||
      title;
    return { lat, lng, resolvedName };
  } catch (err) {
    console.warn(`[geocode] Error for "${title}":`, err);
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
      if (line.match(EVENT_RE) || line.match(/^#[tmbqap]\s+/)) {
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
