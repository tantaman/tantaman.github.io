import type { ServerSql } from "@rindle/api-server";

import type { CreateThoughtArgs } from "../shared/app-def.ts";

type Enrichments = CreateThoughtArgs["enrichments"];

export interface ThoughtEnrichmentConfig {
  mapboxToken?: string;
  tmdbApiKey?: string;
}

const LOCATION_PROJECTION = "mapbox-geocode-v6:1";
const MOVIE_PROJECTION = "tmdb-search:1";
const BOOK_PROJECTION = "openlibrary-search:1";
const ALBUM_PROJECTION = "itunes-search:1";
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Attach post-commit work to the Cloudflare request when available. Ordinary Node development has
 * no `cloudflare:workers` module, but its process remains alive for the already-started promise.
 * Importing through a runtime string keeps the Workers-only module out of Node's static graph.
 */
export async function scheduleThoughtEnrichments(
  sql: ServerSql,
  enrichments: Enrichments,
  config: ThoughtEnrichmentConfig,
): Promise<void> {
  const work = enrichThoughtRows(sql, enrichments, config).catch((error) => {
    console.error("thought enrichment failed", error);
  });
  try {
    const specifier = "cloudflare:workers";
    const workers = (await import(/* @vite-ignore */ specifier)) as {
      waitUntil?: (promise: Promise<unknown>) => void;
    };
    workers.waitUntil?.(work);
  } catch {
    void work;
  }
}

async function enrichThoughtRows(
  sql: ServerSql,
  enrichments: Enrichments,
  config: ThoughtEnrichmentConfig,
): Promise<void> {
  await Promise.allSettled([
    ...enrichments.locations.map((row) => enrichLocation(sql, row, config.mapboxToken)),
    ...enrichments.movies.map((row) => enrichMovie(sql, row.normalizedTitle, row.title, config.tmdbApiKey)),
    ...enrichments.books.map((row) => enrichBook(sql, row.id, row.title)),
    ...enrichments.albums.map((row) => enrichAlbum(sql, row.normalizedTitle, row.title)),
  ]);
}

async function enrichLocation(
  sql: ServerSql,
  row: Enrichments["locations"][number],
  token?: string,
): Promise<void> {
  if (!token) {
    await sql.execute(
      `UPDATE "location"
       SET "resolutionStatus" = 'unavailable', "resolutionRevision" = ?
       WHERE "id" = ? AND "sourceRevision" = ?`,
      [LOCATION_PROJECTION, row.id, row.sourceRevision],
    );
    return;
  }

  const metadata = await geocodeLocation(row.title, token);
  await sql.execute(
    `UPDATE "location"
     SET "latitude" = ?, "longitude" = ?, "resolvedName" = ?,
         "resolutionStatus" = ?, "resolutionRevision" = ?
     WHERE "id" = ? AND "sourceRevision" = ?`,
    [
      metadata?.latitude ?? null,
      metadata?.longitude ?? null,
      metadata?.resolvedName ?? null,
      metadata ? "ready" : "not-found",
      LOCATION_PROJECTION,
      row.id,
      row.sourceRevision,
    ],
  );
}

async function geocodeLocation(
  title: string,
  token: string,
): Promise<{ latitude: number; longitude: number; resolvedName: string } | null> {
  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
    url.searchParams.set("q", title);
    url.searchParams.set("access_token", token);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = await response.json() as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: { full_address?: string; name?: string; place_formatted?: string };
      }>;
    };
    const feature = data.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!feature || !coordinates) return null;
    return {
      longitude: coordinates[0],
      latitude: coordinates[1],
      resolvedName:
        feature.properties?.full_address ??
        feature.properties?.place_formatted ??
        feature.properties?.name ??
        title,
    };
  } catch {
    return null;
  }
}

async function enrichMovie(
  sql: ServerSql,
  normalizedTitle: string,
  title: string,
  token?: string,
): Promise<void> {
  const [stored] = await sql.query<{
    id: string;
    metadataStatus: string;
    metadataProjectionVersion: string | null;
  }>(
    `SELECT "id", "metadataStatus", "metadataProjectionVersion"
     FROM "movie" WHERE "normalizedTitle" = ? LIMIT 1`,
    [normalizedTitle],
  );
  if (!stored || (stored.metadataStatus === "ready" && stored.metadataProjectionVersion === MOVIE_PROJECTION)) return;
  if (!token) {
    await sql.execute(
      `UPDATE "movie" SET "metadataStatus" = 'unavailable', "metadataProjectionVersion" = ? WHERE "id" = ?`,
      [MOVIE_PROJECTION, stored.id],
    );
    return;
  }

  const metadata = await lookupMovie(title, token);
  await sql.execute(
    `UPDATE "movie"
     SET "posterUrl" = ?, "year" = ?, "tmdbId" = ?, "voteAverage" = ?, "voteCount" = ?,
         "metadataStatus" = ?, "metadataProjectionVersion" = ?
     WHERE "id" = ?`,
    [
      metadata?.posterUrl ?? null,
      metadata?.year ?? null,
      metadata?.tmdbId ?? null,
      metadata?.voteAverage ?? null,
      metadata?.voteCount ?? null,
      metadata ? "ready" : "not-found",
      MOVIE_PROJECTION,
      stored.id,
    ],
  );
}

async function lookupMovie(title: string, token: string): Promise<{
  posterUrl: string;
  year: string;
  tmdbId: number;
  voteAverage: number;
  voteCount: number;
} | null> {
  try {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", title);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = await response.json() as {
      results?: Array<{
        id: number;
        poster_path?: string | null;
        release_date?: string;
        vote_average?: number;
        vote_count?: number;
      }>;
    };
    const result = data.results?.[0];
    if (!result?.poster_path) return null;
    return {
      posterUrl: `https://image.tmdb.org/t/p/w300${result.poster_path}`,
      year: result.release_date?.slice(0, 4) ?? "",
      tmdbId: result.id,
      voteAverage: result.vote_average ?? 0,
      voteCount: result.vote_count ?? 0,
    };
  } catch {
    return null;
  }
}

async function enrichBook(sql: ServerSql, id: string, title: string): Promise<void> {
  const metadata = await lookupBook(title);
  await sql.execute(
    `UPDATE "book"
     SET "coverUrl" = ?, "author" = ?, "year" = ?, "openLibraryKey" = ?,
         "metadataStatus" = ?, "metadataProjectionVersion" = ?
     WHERE "id" = ?`,
    [
      metadata?.coverUrl ?? null,
      metadata?.author ?? null,
      metadata?.year ?? null,
      metadata?.openLibraryKey ?? null,
      metadata ? "ready" : "not-found",
      BOOK_PROJECTION,
      id,
    ],
  );
}

async function lookupBook(title: string): Promise<{
  coverUrl: string;
  author: string;
  year: string;
  openLibraryKey: string;
} | null> {
  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", title);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = await response.json() as {
      docs?: Array<{
        key?: string;
        author_name?: string[];
        first_publish_year?: number;
        cover_i?: number;
      }>;
    };
    const result = data.docs?.[0];
    if (!result?.cover_i) return null;
    return {
      coverUrl: `https://covers.openlibrary.org/b/id/${result.cover_i}-M.jpg`,
      author: result.author_name?.[0] ?? "",
      year: result.first_publish_year ? String(result.first_publish_year) : "",
      openLibraryKey: result.key ?? "",
    };
  } catch {
    return null;
  }
}

async function enrichAlbum(sql: ServerSql, normalizedTitle: string, title: string): Promise<void> {
  const [stored] = await sql.query<{
    id: string;
    metadataStatus: string;
    metadataProjectionVersion: string | null;
  }>(
    `SELECT "id", "metadataStatus", "metadataProjectionVersion"
     FROM "album" WHERE "normalizedTitle" = ? LIMIT 1`,
    [normalizedTitle],
  );
  if (!stored || (stored.metadataStatus === "ready" && stored.metadataProjectionVersion === ALBUM_PROJECTION)) return;
  const metadata = await lookupAlbum(title);
  await sql.execute(
    `UPDATE "album"
     SET "artist" = ?, "year" = ?, "coverUrl" = ?, "itunesId" = ?, "genre" = ?,
         "metadataStatus" = ?, "metadataProjectionVersion" = ?
     WHERE "id" = ?`,
    [
      metadata?.artist ?? null,
      metadata?.year ?? null,
      metadata?.coverUrl ?? null,
      metadata?.itunesId ?? null,
      metadata?.genre ?? null,
      metadata ? "ready" : "not-found",
      ALBUM_PROJECTION,
      stored.id,
    ],
  );
}

async function lookupAlbum(title: string): Promise<{
  artist: string;
  year: string;
  coverUrl: string;
  itunesId: number;
  genre: string;
} | null> {
  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("media", "music");
    url.searchParams.set("entity", "album");
    url.searchParams.set("limit", "1");
    url.searchParams.set("term", title);
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const data = await response.json() as {
      results?: Array<{
        collectionId: number;
        artistName?: string;
        releaseDate?: string;
        artworkUrl100?: string;
        primaryGenreName?: string;
      }>;
    };
    const result = data.results?.[0];
    if (!result?.artworkUrl100) return null;
    return {
      artist: result.artistName ?? "",
      year: result.releaseDate?.slice(0, 4) ?? "",
      coverUrl: result.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1"),
      itunesId: result.collectionId,
      genre: result.primaryGenreName ?? "",
    };
  } catch {
    return null;
  }
}
