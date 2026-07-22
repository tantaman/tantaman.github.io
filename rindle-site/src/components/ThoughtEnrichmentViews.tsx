import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { ResultType } from "@rindle/react";

import { app } from "../rindle-client.ts";
import { useThoughtsFeed } from "./ThoughtsFeed.tsx";
import {
  ENRICHMENT_MAX_LIMIT,
  ENRICHMENT_PAGE_SIZE,
  thoughtAdminAlbumsQuery,
  thoughtAdminBooksQuery,
  thoughtAdminEventsQuery,
  thoughtAdminLocationsQuery,
  thoughtAdminMoviesQuery,
  thoughtAdminProjectsQuery,
  thoughtAdminQuestionsQuery,
  thoughtAdminTasksQuery,
  thoughtAlbumsQuery,
  thoughtBooksQuery,
  thoughtEventsQuery,
  thoughtLocationsQuery,
  thoughtMoviesQuery,
  thoughtProjectsQuery,
  thoughtQuestionsQuery,
  thoughtTasksQuery,
  type AlbumEnrichmentRow,
  type BookEnrichmentRow,
  type EventEnrichmentRow,
  type LocationEnrichmentRow,
  type MovieEnrichmentRow,
  type ProjectEnrichmentRow,
  type QuestionEnrichmentRow,
  type TaskEnrichmentRow,
} from "./ThoughtEnrichment.queries.ts";

interface LaneFrameProps {
  code: string;
  title: string;
  description: string;
  count: number;
  status: ResultType;
  hasMore: boolean;
  loadMore: () => void;
  children: ReactNode;
}

function LaneFrame({ code, title, description, count, status, hasMore, loadMore, children }: LaneFrameProps) {
  const loading = count === 0 && status !== "complete";
  return (
    <section className="thought-lane-page">
      <header className="thought-lane-head">
        <div>
          <span>{code}</span>
          <h1>{title}</h1>
        </div>
        <p>{description}</p>
      </header>
      {loading ? (
        <div className="thoughts-loading" aria-live="polite"><span aria-hidden="true" /> Loading {title.toLowerCase()}…</div>
      ) : count === 0 ? (
        <div className="thoughts-empty"><span aria-hidden="true">◇</span><p>No {title.toLowerCase()} yet.</p></div>
      ) : children}
      {hasMore ? (
        <div className="thoughts-load-more">
          <button className="load-more-button" type="button" onClick={loadMore} disabled={status !== "complete"}>
            {status === "complete" ? `Load more ${title.toLowerCase()}` : "Loading…"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function useLimit() {
  const [limit, setLimit] = useState(ENRICHMENT_PAGE_SIZE);
  return {
    limit,
    loadMore: () => setLimit((current) => Math.min(current + ENRICHMENT_PAGE_SIZE, ENRICHMENT_MAX_LIMIT)),
  };
}

function sourceId(source: unknown): string | null {
  const value = Array.isArray(source) ? source[0] : source;
  if (!value || typeof value !== "object") return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function relatedTitle(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const title = (row as { title?: unknown }).title;
  return typeof title === "string" ? title : null;
}

function SourceLink({ source }: { source: unknown }) {
  const id = sourceId(source);
  return id ? <Link className="thought-lane-source" to="/thoughts/$id" params={{ id }}>source thought →</Link> : null;
}

function Description({ children }: { children: string | null }) {
  return children ? <p className="thought-lane-description">{children}</p> : null;
}

export function ProjectsEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const query = isAdmin ? thoughtAdminProjectsQuery : thoughtProjectsQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const rows = allRows.slice(0, limit) as readonly ProjectEnrichmentRow[];

  function setStatus(row: ProjectEnrichmentRow, next: "active" | "archived") {
    app.mutate.updateProjectStatus({
      id: row.id,
      status: next,
      archivedAt: next === "archived" ? Date.now() : null,
    });
  }

  return (
    <LaneFrame code="#p" title="Projects" description="Draft projects captured in thought threads. Tasks in replies accrete here until a draft is activated." count={rows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-lane-stack">
        {rows.map((row) => (
          <article className="thought-project-row" key={row.id}>
            <div className="thought-project-main">
              <span className={`thought-lane-status is-${row.status}`}>{row.status}</span>
              <h2>{row.title}</h2>
              <Description>{row.description}</Description>
              <p className="thought-project-progress">{row.completedCount} / {row.taskCount} tasks complete</p>
            </div>
            <div className="thought-lane-actions">
              <SourceLink source={row.source} />
              {isAdmin && row.status === "draft" ? <button type="button" onClick={() => setStatus(row, "active")}>Activate</button> : null}
              {isAdmin && row.status === "active" ? <button type="button" onClick={() => setStatus(row, "archived")}>Archive</button> : null}
            </div>
          </article>
        ))}
      </div>
    </LaneFrame>
  );
}

export function TasksEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeprioritized, setShowDeprioritized] = useState(false);
  const query = isAdmin ? thoughtAdminTasksQuery : thoughtTasksQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const windowRows = allRows.slice(0, limit) as readonly TaskEnrichmentRow[];
  const rows = windowRows.filter((row) =>
    (showCompleted || row.completedAt === null) &&
    (showDeprioritized || row.deprioritizedAt === null),
  );

  return (
    <LaneFrame code="#t" title="Tasks" description="Actionable lines captured from thoughts, with direct completion and deprioritization state." count={windowRows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-lane-filters">
        <label><input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} /> Show completed</label>
        <label><input type="checkbox" checked={showDeprioritized} onChange={(event) => setShowDeprioritized(event.target.checked)} /> Show deprioritized</label>
      </div>
      {rows.length === 0 ? <p className="thought-lane-filter-empty">No tasks match these filters.</p> : (
        <ul className="thought-check-list">
          {rows.map((row) => (
            <li key={row.id} className={row.completedAt !== null ? "is-done" : row.deprioritizedAt !== null ? "is-deprioritized" : undefined}>
              <input
                type="checkbox"
                checked={row.completedAt !== null}
                disabled={!isAdmin}
                aria-label={`Mark ${row.title} ${row.completedAt === null ? "complete" : "incomplete"}`}
                onChange={() => app.mutate.updateTaskState({ id: row.id, completedAt: row.completedAt === null ? Date.now() : null })}
              />
              <div><strong>{row.title}</strong><Description>{row.description}</Description>{relatedTitle(row.project) ? <span className="thought-lane-project">{relatedTitle(row.project)}</span> : null}</div>
              <div className="thought-lane-actions">
                {isAdmin ? <button type="button" className={row.deprioritizedAt !== null ? "is-active" : undefined} onClick={() => app.mutate.updateTaskState({ id: row.id, deprioritizedAt: row.deprioritizedAt === null ? Date.now() : null })}>later</button> : null}
                <SourceLink source={row.source} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </LaneFrame>
  );
}

export function QuestionsEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const [showAnswered, setShowAnswered] = useState(false);
  const query = isAdmin ? thoughtAdminQuestionsQuery : thoughtQuestionsQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const windowRows = allRows.slice(0, limit) as readonly QuestionEnrichmentRow[];
  const rows = showAnswered ? windowRows : windowRows.filter((row) => row.answeredAt === null);
  return (
    <LaneFrame code="#q" title="Questions" description="Open loops worth returning to. Mark one answered without changing its source thought." count={windowRows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-lane-filters"><label><input type="checkbox" checked={showAnswered} onChange={(event) => setShowAnswered(event.target.checked)} /> Show answered</label></div>
      {rows.length === 0 ? <p className="thought-lane-filter-empty">No open questions.</p> : (
        <ul className="thought-check-list">
          {rows.map((row) => (
            <li key={row.id} className={row.answeredAt !== null ? "is-done" : undefined}>
              <input type="checkbox" checked={row.answeredAt !== null} disabled={!isAdmin} aria-label={`Mark ${row.title} ${row.answeredAt === null ? "answered" : "open"}`} onChange={() => app.mutate.updateQuestionState({ id: row.id, answeredAt: row.answeredAt === null ? Date.now() : null })} />
              <div><strong>{row.title}</strong><Description>{row.description}</Description></div>
              <SourceLink source={row.source} />
            </li>
          ))}
        </ul>
      )}
    </LaneFrame>
  );
}

const EVENT_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function EventsEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const query = isAdmin ? thoughtAdminEventsQuery : thoughtEventsQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const rows = allRows.slice(0, limit) as readonly EventEnrichmentRow[];
  return (
    <LaneFrame code="#e" title="Events" description="Dates parsed at capture time from today, tomorrow, weekdays, or calendar dates." count={rows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-event-list">
        {rows.map((row) => (
          <article key={row.id}>
            <time dateTime={new Date(row.dateEpoch * 1_000).toISOString()}>{EVENT_TIME.format(new Date(row.dateEpoch * 1_000))}</time>
            <div><h2>{row.title}</h2><span className="thought-event-token">{row.dateText}</span><Description>{row.description}</Description></div>
            <SourceLink source={row.source} />
          </article>
        ))}
      </div>
    </LaneFrame>
  );
}

export function LocationsEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const query = isAdmin ? thoughtAdminLocationsQuery : thoughtLocationsQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const rows = allRows.slice(0, limit) as readonly LocationEnrichmentRow[];
  return (
    <LaneFrame code="#l" title="Locations" description="Place captures resolved by the server when Mapbox is configured; unresolved names remain useful and searchable." count={rows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-location-grid">
        {rows.map((row) => {
          const mapUrl = row.latitude !== null && row.longitude !== null
            ? `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=15/${row.latitude}/${row.longitude}`
            : `https://www.openstreetmap.org/search?query=${encodeURIComponent(row.title)}`;
          return (
            <article key={row.id}>
              <span className="thought-location-pin" aria-hidden="true">⌖</span>
              <div><h2><a href={mapUrl} target="_blank" rel="noreferrer">{row.title}</a></h2>{row.resolvedName ? <p>{row.resolvedName}</p> : <span className="thought-lane-status">{row.resolutionStatus}</span>}<Description>{row.description}</Description></div>
              <SourceLink source={row.source} />
            </article>
          );
        })}
      </div>
    </LaneFrame>
  );
}

function MediaCard({
  title,
  image,
  meta,
  description,
  externalUrl,
  source,
  mentionCount,
}: {
  title: string;
  image: string | null;
  meta: string[];
  description: string | null;
  externalUrl?: string | null;
  source: unknown;
  mentionCount?: number;
}) {
  const art = image
    ? <img src={image} alt="" loading="lazy" />
    : <span className="thought-media-placeholder" aria-hidden="true">{title.slice(0, 1).toUpperCase()}</span>;
  return (
    <article className="thought-media-card">
      {externalUrl ? <a className="thought-media-art" href={externalUrl} target="_blank" rel="noreferrer">{art}</a> : <div className="thought-media-art">{art}</div>}
      <div className="thought-media-info">
        <h2>{title}{mentionCount && mentionCount > 1 ? <small> ×{mentionCount}</small> : null}</h2>
        {meta.filter(Boolean).length > 0 ? <p className="thought-media-meta">{meta.filter(Boolean).join(" · ")}</p> : null}
        <Description>{description}</Description>
        <SourceLink source={source} />
      </div>
    </article>
  );
}

function firstMentionSource(mentions: readonly unknown[]): unknown {
  const first = mentions[0];
  if (!first || typeof first !== "object") return null;
  const thoughtId = (first as { thoughtId?: unknown }).thoughtId;
  return typeof thoughtId === "string" ? { id: thoughtId } : null;
}

function firstMentionDescription(mentions: readonly unknown[]): string | null {
  const first = mentions[0];
  if (!first || typeof first !== "object") return null;
  const description = (first as { description?: unknown }).description;
  return typeof description === "string" ? description : null;
}

export function BooksEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const query = isAdmin ? thoughtAdminBooksQuery : thoughtBooksQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const rows = allRows.slice(0, limit) as readonly BookEnrichmentRow[];
  return (
    <LaneFrame code="#b" title="Books" description="Reading captures enriched through Open Library, while each mention retains its own notes." count={rows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-media-grid">{rows.map((row) => <MediaCard key={row.id} title={row.title} image={row.coverUrl} meta={[row.author ?? "", row.year ?? ""]} description={row.description} externalUrl={row.openLibraryKey ? `https://openlibrary.org${row.openLibraryKey}` : null} source={row.source} />)}</div>
    </LaneFrame>
  );
}

export function MoviesEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const query = isAdmin ? thoughtAdminMoviesQuery : thoughtMoviesQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const rows = allRows.slice(0, limit) as readonly MovieEnrichmentRow[];
  return (
    <LaneFrame code="#m" title="Movies" description="Deduplicated movie mentions with optional TMDB posters, release years, and ratings." count={rows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-media-grid">{rows.map((row) => <MediaCard key={row.id} title={row.title} image={row.posterUrl} meta={[row.year ?? "", row.voteAverage ? `${row.voteAverage.toFixed(1)}/10` : ""]} description={firstMentionDescription(row.mentions)} externalUrl={row.tmdbId ? `https://www.themoviedb.org/movie/${row.tmdbId}` : null} source={firstMentionSource(row.mentions)} mentionCount={row.mentionCount} />)}</div>
    </LaneFrame>
  );
}

export function AlbumsEnrichmentView() {
  const { isAdmin } = useThoughtsFeed();
  const { limit, loadMore } = useLimit();
  const query = isAdmin ? thoughtAdminAlbumsQuery : thoughtAlbumsQuery;
  const [allRows, { status }] = useRoot(query, { limit });
  const rows = allRows.slice(0, limit) as readonly AlbumEnrichmentRow[];
  return (
    <LaneFrame code="#a" title="Music" description="Deduplicated album captures enriched through Apple Music with artwork, artist, year, and genre." count={rows.length} status={status} hasMore={allRows.length > limit} loadMore={loadMore}>
      <div className="thought-media-grid">{rows.map((row) => <MediaCard key={row.id} title={row.title} image={row.coverUrl} meta={[row.artist ?? "", row.year ?? "", row.genre ?? ""]} description={firstMentionDescription(row.mentions)} externalUrl={row.itunesId ? `https://music.apple.com/album/${row.itunesId}` : null} source={firstMentionSource(row.mentions)} mentionCount={row.mentionCount} />)}</div>
    </LaneFrame>
  );
}
