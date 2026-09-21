// The one renderer for a resolved enrichment target. A curation surface stores `(itemType, itemId)`
// and the shared fragment in ItemCard.queries.ts fans that out into per-kind rows; this module turns
// whichever row came back into a discriminated target and draws it.
//
// Deliberately absent: mention notes and source-thought links. A lane renders those because it is
// already scoped to the reader's visibility, but a curation surface publishes whatever the author
// placed on it, so an entity card here shows only the entity's own fields (see `ItemPrivacyModel` in
// shared/item-kinds.ts).

import type { ReactNode } from "react";

import { ITEM_KIND_PROFILES, isEnrichmentItemKind, type EnrichmentItemKind } from "../../shared/item-kinds.ts";
import { MediaCard } from "./MediaCard.tsx";

// --------------------------------------------------------------- resolved rows

export interface ProjectTargetRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  private: number;
  createdAt: number;
}
export interface TaskTargetRow {
  id: string;
  title: string;
  description: string | null;
  completedAt: number | null;
  deprioritizedAt: number | null;
  private: number;
  createdAt: number;
}
export interface QuestionTargetRow {
  id: string;
  title: string;
  description: string | null;
  answeredAt: number | null;
  createdAt: number;
}
export interface EventTargetRow {
  id: string;
  title: string;
  description: string | null;
  dateText: string;
  dateEpoch: number;
  createdAt: number;
}
export interface LocationTargetRow {
  id: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  resolvedName: string | null;
  resolutionStatus: string;
}
export interface BookTargetRow {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  year: string | null;
  coverUrl: string | null;
  openLibraryKey: string | null;
  metadataStatus: string;
}
export interface MovieTargetRow {
  id: string;
  title: string;
  posterUrl: string | null;
  year: string | null;
  voteAverage: number | null;
  tmdbId: number | null;
  metadataStatus: string;
}
export interface AlbumTargetRow {
  id: string;
  title: string;
  artist: string | null;
  year: string | null;
  genre: string | null;
  coverUrl: string | null;
  itunesId: number | null;
  metadataStatus: string;
}
export interface BookmarkTargetRow {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  metadataStatus: string;
}

/** A sub-selection resolves to the row, a one-element list, or nothing at all when the reader's
 *  privacy gate excluded it. Only the enrichment kinds appear here: thoughts, posts, and framings are
 *  resolved by the surfaces that own their bespoke rendering. */
export interface EnrichmentItemRow {
  project?: ProjectTargetRow | readonly ProjectTargetRow[] | null;
  task?: TaskTargetRow | readonly TaskTargetRow[] | null;
  question?: QuestionTargetRow | readonly QuestionTargetRow[] | null;
  event?: EventTargetRow | readonly EventTargetRow[] | null;
  location?: LocationTargetRow | readonly LocationTargetRow[] | null;
  book?: BookTargetRow | readonly BookTargetRow[] | null;
  movie?: MovieTargetRow | readonly MovieTargetRow[] | null;
  album?: AlbumTargetRow | readonly AlbumTargetRow[] | null;
  bookmark?: BookmarkTargetRow | readonly BookmarkTargetRow[] | null;
}

export type EnrichmentItemTarget =
  | { kind: "project"; id: string; row: ProjectTargetRow }
  | { kind: "task"; id: string; row: TaskTargetRow }
  | { kind: "question"; id: string; row: QuestionTargetRow }
  | { kind: "event"; id: string; row: EventTargetRow }
  | { kind: "location"; id: string; row: LocationTargetRow }
  | { kind: "book"; id: string; row: BookTargetRow }
  | { kind: "movie"; id: string; row: MovieTargetRow }
  | { kind: "album"; id: string; row: AlbumTargetRow }
  | { kind: "bookmark"; id: string; row: BookmarkTargetRow };

function one<T>(value: T | readonly T[] | null | undefined): T | null {
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return (value ?? null) as T | null;
}

/** Narrow a resolved curation row to the single target its `itemType` names. Returns null when the
 *  kind is not an enrichment kind, or when the reader's privacy gate withheld the row — a caller
 *  drops the node rather than drawing an empty frame. */
export function resolveEnrichmentTarget(itemType: string, row: EnrichmentItemRow): EnrichmentItemTarget | null {
  if (!isEnrichmentItemKind(itemType)) return null;
  const kind: EnrichmentItemKind = itemType;
  switch (kind) {
    case "project": { const target = one(row.project); return target ? { kind, id: target.id, row: target } : null; }
    case "task": { const target = one(row.task); return target ? { kind, id: target.id, row: target } : null; }
    case "question": { const target = one(row.question); return target ? { kind, id: target.id, row: target } : null; }
    case "event": { const target = one(row.event); return target ? { kind, id: target.id, row: target } : null; }
    case "location": { const target = one(row.location); return target ? { kind, id: target.id, row: target } : null; }
    case "book": { const target = one(row.book); return target ? { kind, id: target.id, row: target } : null; }
    case "movie": { const target = one(row.movie); return target ? { kind, id: target.id, row: target } : null; }
    case "album": { const target = one(row.album); return target ? { kind, id: target.id, row: target } : null; }
    case "bookmark": { const target = one(row.bookmark); return target ? { kind, id: target.id, row: target } : null; }
  }
}

/** The title a surface shows for a target — also what a picker chip and an accessible label use. */
export function itemTargetTitle(target: EnrichmentItemTarget): string {
  if (target.kind === "bookmark") return target.row.title?.trim() || hostOf(target.row.url);
  return target.row.title;
}

// --------------------------------------------------------------- rendering

const EVENT_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const DESCRIPTION_MAX = 160;

/** A media entity is created the moment its tag is parsed and enriched afterwards, so a card can
 *  legitimately have no artwork yet. Say so instead of showing a blank cover. */
function pending(metadataStatus: string): string | null {
  return metadataStatus === "pending" ? "enriching…" : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

function clamp(value: string | null): string | null {
  if (!value) return null;
  const clean = value.trim();
  if (!clean) return null;
  return clean.length > DESCRIPTION_MAX ? `${clean.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : clean;
}

/** The capture tag doubles as the card's sigil, so a placed item reads the same as the lane and the
 *  thought body that minted it. Bookmarks have no tag — they are extracted from links. */
function sigil(kind: EnrichmentItemKind): string {
  return ITEM_KIND_PROFILES[kind].code ?? "↗";
}

function ItemFrame({
  kind,
  title,
  meta,
  description,
  banner,
}: {
  kind: EnrichmentItemKind;
  title: ReactNode;
  meta: (string | null)[];
  description: string | null;
  banner?: ReactNode;
}) {
  const shownMeta = meta.filter((value): value is string => Boolean(value));
  return (
    <article className={`thought-item-card thought-item-card--${kind}`}>
      {banner}
      <div className="thought-item-head">
        <span className="thought-item-sigil" aria-hidden="true">{sigil(kind)}</span>
        <h2 className="thought-item-title">{title}</h2>
      </div>
      {shownMeta.length > 0 ? <p className="thought-item-meta">{shownMeta.join(" · ")}</p> : null}
      {description ? <p className="thought-item-description">{description}</p> : null}
    </article>
  );
}

export function ItemCard({ target }: { target: EnrichmentItemTarget }) {
  switch (target.kind) {
    case "book":
      return (
        <MediaCard
          className="thought-media-card--compact"
          title={target.row.title}
          image={target.row.coverUrl}
          meta={[target.row.author, target.row.year, pending(target.row.metadataStatus)]}
          description={clamp(target.row.description)}
          externalUrl={target.row.openLibraryKey ? `https://openlibrary.org${target.row.openLibraryKey}` : null}
        />
      );
    case "movie":
      return (
        <MediaCard
          className="thought-media-card--compact"
          title={target.row.title}
          image={target.row.posterUrl}
          meta={[
            target.row.year,
            target.row.voteAverage ? `${target.row.voteAverage.toFixed(1)}/10` : null,
            pending(target.row.metadataStatus),
          ]}
          externalUrl={target.row.tmdbId ? `https://www.themoviedb.org/movie/${target.row.tmdbId}` : null}
        />
      );
    case "album":
      return (
        <MediaCard
          className="thought-media-card--compact"
          title={target.row.title}
          image={target.row.coverUrl}
          meta={[target.row.artist, target.row.year, target.row.genre, pending(target.row.metadataStatus)]}
          externalUrl={target.row.itunesId ? `https://music.apple.com/album/${target.row.itunesId}` : null}
        />
      );
    case "bookmark": {
      const title = itemTargetTitle(target);
      return (
        <ItemFrame
          kind="bookmark"
          title={<a href={target.row.url} target="_blank" rel="noreferrer" className="nodrag">{title}</a>}
          meta={[target.row.siteName ?? hostOf(target.row.url)]}
          description={clamp(target.row.description)}
          banner={target.row.imageUrl
            ? <img className="thought-item-banner" src={target.row.imageUrl} alt="" loading="lazy" decoding="async" />
            : undefined}
        />
      );
    }
    case "project":
      return (
        <ItemFrame
          kind="project"
          title={target.row.title}
          meta={[target.row.status]}
          description={clamp(target.row.description)}
        />
      );
    case "task":
      return (
        <ItemFrame
          kind="task"
          title={
            <span className={target.row.completedAt ? "thought-item-title-done" : undefined}>{target.row.title}</span>
          }
          meta={[
            target.row.completedAt ? "done" : null,
            target.row.deprioritizedAt ? "deprioritized" : null,
          ]}
          description={clamp(target.row.description)}
        />
      );
    case "question":
      return (
        <ItemFrame
          kind="question"
          title={target.row.title}
          meta={[target.row.answeredAt ? "answered" : "open"]}
          description={clamp(target.row.description)}
        />
      );
    case "event":
      return (
        <ItemFrame
          kind="event"
          title={target.row.title}
          meta={[EVENT_DATE.format(new Date(target.row.dateEpoch * 1_000)), target.row.dateText]}
          description={clamp(target.row.description)}
        />
      );
    case "location":
      return (
        <ItemFrame
          kind="location"
          title={target.row.title}
          meta={[target.row.resolvedName ?? target.row.resolutionStatus]}
          description={clamp(target.row.description)}
        />
      );
  }
}
