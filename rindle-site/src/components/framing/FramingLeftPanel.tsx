import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { renderThoughtMarkdown } from "../../lib/thoughts.ts";
import { currentQueryContext } from "../../rindle-client.ts";
import {
  ITEM_KINDS,
  ITEM_KIND_PROFILES,
  itemKey,
  type ItemKind,
} from "../../../shared/item-kinds.ts";
import {
  FRAMINGS_LIMIT,
  FRAMING_PICKER_MAX_LIMIT,
  FRAMING_PICKER_PAGE_SIZE,
  framingPostsQuery,
  framingThoughtsQuery,
  framingsQuery,
  type FramingPostPickerRow,
  type FramingThoughtPickerRow,
  type FramingsRow,
} from "../Framing.queries.ts";
import {
  thoughtAlbumsQuery,
  thoughtBookmarksQuery,
  thoughtBooksQuery,
  thoughtEventsQuery,
  thoughtLocationsQuery,
  thoughtMoviesQuery,
  thoughtProjectsQuery,
  thoughtQuestionsQuery,
  thoughtTasksQuery,
  type AlbumEnrichmentRow,
  type BookEnrichmentRow,
  type BookmarkEnrichmentRow,
  type EventEnrichmentRow,
  type LocationEnrichmentRow,
  type MovieEnrichmentRow,
  type ProjectEnrichmentRow,
  type QuestionEnrichmentRow,
  type TaskEnrichmentRow,
} from "../ThoughtEnrichment.queries.ts";

type ThoughtPickerRow = FramingThoughtPickerRow;

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

/** One drag payload spelling for every kind, so the canvas's drop handler stays a single check
 *  against the item registry. */
function dragProps(kind: ItemKind, id: string, editable: boolean, placed: boolean) {
  return {
    draggable: editable && !placed,
    onDragStart: (event: ReactDragEvent<HTMLDivElement>) => {
      if (!editable || placed) { event.preventDefault(); return; }
      event.dataTransfer.setData("application/node-type", kind);
      event.dataTransfer.setData("application/item-id", id);
      event.dataTransfer.effectAllowed = "copy";
    },
  };
}

function ThoughtItem({ thought, placed, editable }: { thought: ThoughtPickerRow; placed: boolean; editable: boolean }) {
  return (
    <div
      className={`framing-panel-thought${placed ? " placed" : ""}`}
      style={thought.color ? { borderLeftColor: thought.color } : undefined}
      {...dragProps("thought", thought.id, editable, placed)}
    >
      <div
        className="thought-markdown framing-panel-thought-body"
        dangerouslySetInnerHTML={{ __html: renderThoughtMarkdown(truncate(thought.body, 220)) }}
      />
      {thought.private === 1 ? <span className="framing-panel-private">private</span> : null}
    </div>
  );
}

function PostItem({ post, placed, editable }: { post: FramingPostPickerRow; placed: boolean; editable: boolean }) {
  return (
    <div
      className={`framing-panel-post${placed ? " placed" : ""}`}
      style={post.color ? { borderLeftColor: post.color } : undefined}
      {...dragProps("post", post.id, editable, placed)}
    >
      <div className="framing-panel-post-title">{post.title}</div>
      {post.date ? <div className="framing-panel-post-date">{post.date}</div> : null}
      {post.description ? <div className="framing-panel-post-summary">{truncate(post.description, 120)}</div> : null}
    </div>
  );
}

function FramingItem({ framing, placed, editable }: { framing: FramingsRow; placed: boolean; editable: boolean }) {
  return (
    <div
      className={`framing-panel-framing${placed ? " placed" : ""}`}
      {...dragProps("framing", framing.id, editable, placed)}
    >
      <span aria-hidden="true">⌘</span>
      <div className="framing-panel-framing-title">{framing.name || "Untitled"}</div>
      {framing.private === 1 ? <span className="framing-privacy-badge">private</span> : null}
    </div>
  );
}

// --------------------------------------------------------------- enrichment pickers

/** Every enrichment kind reduces to the same chip, so the panel needs one renderer and one search
 *  rule rather than nine. The lane windows are already named, registered, and privacy-correct, so the
 *  picker subscribes to those instead of minting a parallel set. */
interface PickerChip {
  id: string;
  title: string;
  meta: string | null;
  image: string | null;
}

interface PickerProps {
  search: string;
  limit: number;
  onLoadMore: () => void;
  editable: boolean;
  placedItemKeys: Set<string>;
}

function ChipList({
  kind,
  chips,
  total,
  loading,
  props,
}: {
  kind: ItemKind;
  chips: readonly PickerChip[];
  total: number;
  loading: boolean;
  props: PickerProps;
}) {
  const needle = props.search.trim().toLocaleLowerCase();
  const shown = needle
    ? chips.filter((chip) =>
      chip.title.toLocaleLowerCase().includes(needle) || (chip.meta ?? "").toLocaleLowerCase().includes(needle))
    : chips;

  if (shown.length === 0) {
    return (
      <div className="framing-panel-status">
        {loading ? "Loading…" : `No ${ITEM_KIND_PROFILES[kind].plural.toLocaleLowerCase()} found`}
      </div>
    );
  }
  return (
    <>
      {shown.map((chip) => {
        const placed = props.placedItemKeys.has(itemKey(kind, chip.id));
        return (
          <div
            key={chip.id}
            className={`framing-panel-item${placed ? " placed" : ""}`}
            {...dragProps(kind, chip.id, props.editable, placed)}
          >
            {chip.image
              ? <img className="framing-panel-item-art" src={chip.image} alt="" loading="lazy" decoding="async" />
              : <span className="framing-panel-item-sigil" aria-hidden="true">{ITEM_KIND_PROFILES[kind].code ?? "↗"}</span>}
            <div className="framing-panel-item-body">
              <div className="framing-panel-item-title">{chip.title}</div>
              {chip.meta ? <div className="framing-panel-item-meta">{chip.meta}</div> : null}
            </div>
          </div>
        );
      })}
      {total > props.limit && props.limit < FRAMING_PICKER_MAX_LIMIT ? (
        <button type="button" className="framing-panel-load-more" onClick={props.onLoadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </>
  );
}

function ProjectPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtProjectsQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly ProjectEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.status, image: null,
  }));
  return <ChipList kind="project" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function TaskPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtTasksQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly TaskEnrichmentRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    meta: row.completedAt ? "done" : row.deprioritizedAt ? "deprioritized" : null,
    image: null,
  }));
  return <ChipList kind="task" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function QuestionPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtQuestionsQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly QuestionEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.answeredAt ? "answered" : "open", image: null,
  }));
  return <ChipList kind="question" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function EventPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtEventsQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly EventEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.dateText, image: null,
  }));
  return <ChipList kind="event" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function LocationPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtLocationsQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly LocationEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.resolvedName ?? row.resolutionStatus, image: null,
  }));
  return <ChipList kind="location" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function BookPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtBooksQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly BookEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.author ?? row.year, image: row.coverUrl,
  }));
  return <ChipList kind="book" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function MoviePicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtMoviesQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly MovieEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.year, image: row.posterUrl,
  }));
  return <ChipList kind="movie" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function AlbumPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtAlbumsQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly AlbumEnrichmentRow[]).map((row) => ({
    id: row.id, title: row.title, meta: row.artist ?? row.year, image: row.coverUrl,
  }));
  return <ChipList kind="album" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function BookmarkPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(thoughtBookmarksQuery, { limit: props.limit }, currentQueryContext());
  const chips = (rows.slice(0, props.limit) as readonly BookmarkEnrichmentRow[]).map((row) => ({
    id: row.id,
    title: row.title?.trim() || hostOf(row.url),
    meta: row.siteName ?? hostOf(row.url),
    image: row.imageUrl,
  }));
  return <ChipList kind="bookmark" chips={chips} total={rows.length} loading={status !== "complete"} props={props} />;
}

function ThoughtPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(
    framingThoughtsQuery,
    { search: props.search, limit: props.limit },
    currentQueryContext(),
  );
  const thoughts = rows.slice(0, props.limit) as readonly ThoughtPickerRow[];
  if (thoughts.length === 0) {
    return <div className="framing-panel-status">{status === "complete" ? "No thoughts found" : "Loading…"}</div>;
  }
  return (
    <>
      {thoughts.map((thought) => (
        <ThoughtItem
          key={thought.id}
          thought={thought}
          editable={props.editable}
          placed={props.placedItemKeys.has(itemKey("thought", thought.id))}
        />
      ))}
      {rows.length > props.limit && props.limit < FRAMING_PICKER_MAX_LIMIT ? (
        <button type="button" className="framing-panel-load-more" onClick={props.onLoadMore} disabled={status !== "complete"}>
          {status === "complete" ? "Load more" : "Loading…"}
        </button>
      ) : null}
    </>
  );
}

function PostPicker(props: PickerProps) {
  const [rows, { status }] = useRoot(framingPostsQuery, { search: props.search, limit: props.limit });
  const posts = rows.slice(0, props.limit) as readonly FramingPostPickerRow[];
  if (posts.length === 0) {
    return <div className="framing-panel-status">{status === "complete" ? "No posts found" : "Loading…"}</div>;
  }
  return (
    <>
      {posts.map((post) => (
        <PostItem
          key={post.id}
          post={post}
          editable={props.editable}
          placed={props.placedItemKeys.has(itemKey("post", post.id))}
        />
      ))}
      {rows.length > props.limit && props.limit < FRAMING_PICKER_MAX_LIMIT ? (
        <button type="button" className="framing-panel-load-more" onClick={props.onLoadMore} disabled={status !== "complete"}>
          {status === "complete" ? "Load more" : "Loading…"}
        </button>
      ) : null}
    </>
  );
}

function FramingPicker({ framingId, ...props }: PickerProps & { framingId: string }) {
  const [rows, { status }] = useRoot(framingsQuery, { limit: FRAMINGS_LIMIT }, currentQueryContext());
  const needle = props.search.trim().toLocaleLowerCase();
  const framings = useMemo(() => (rows as readonly FramingsRow[]).filter((frame) =>
    frame.id !== framingId && (!needle || frame.name.toLocaleLowerCase().includes(needle))),
  [rows, needle, framingId]);
  if (framings.length === 0) {
    return <div className="framing-panel-status">{status === "complete" ? "No framings found" : "Loading…"}</div>;
  }
  return (
    <>
      {framings.map((frame) => (
        <FramingItem
          key={frame.id}
          framing={frame}
          editable={props.editable}
          placed={props.placedItemKeys.has(itemKey("framing", frame.id))}
        />
      ))}
    </>
  );
}

/** Only the active kind mounts, so the canvas holds exactly one picker subscription at a time
 *  instead of twelve. */
function ActivePicker({ kind, framingId, props }: { kind: ItemKind; framingId: string; props: PickerProps }) {
  switch (kind) {
    case "thought": return <ThoughtPicker {...props} />;
    case "post": return <PostPicker {...props} />;
    case "framing": return <FramingPicker framingId={framingId} {...props} />;
    case "project": return <ProjectPicker {...props} />;
    case "task": return <TaskPicker {...props} />;
    case "question": return <QuestionPicker {...props} />;
    case "event": return <EventPicker {...props} />;
    case "location": return <LocationPicker {...props} />;
    case "book": return <BookPicker {...props} />;
    case "movie": return <MoviePicker {...props} />;
    case "album": return <AlbumPicker {...props} />;
    case "bookmark": return <BookmarkPicker {...props} />;
  }
}

export function FramingLeftPanel({
  framingId,
  framingName,
  framingPrivate,
  placedItemKeys,
  isAdmin,
  onRename,
  onPrivacyChange,
}: {
  framingId: string;
  framingName: string;
  framingPrivate: boolean;
  placedItemKeys: Set<string>;
  isAdmin: boolean;
  onRename: (name: string) => void;
  onPrivacyChange: (isPrivate: boolean) => void;
}) {
  const [tab, setTab] = useState<ItemKind>("thought");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [limit, setLimit] = useState(FRAMING_PICKER_PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(framingName);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  useEffect(() => {
    setEditValue(framingName);
  }, [framingName]);
  useEffect(() => {
    if (!editing) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editing]);

  const updateSearch = useCallback((value: string) => {
    setQuery(value);
    setLimit(FRAMING_PICKER_PAGE_SIZE);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(value), 250);
  }, []);

  function selectTab(next: ItemKind) {
    setTab(next);
    setQuery("");
    setDebouncedQuery("");
    setLimit(FRAMING_PICKER_PAGE_SIZE);
  }

  function commitTitle() {
    setEditing(false);
    const next = editValue.trim();
    if (next && next !== framingName) onRename(next);
    else setEditValue(framingName);
  }

  const loadMore = useCallback(
    () => setLimit((value) => Math.min(value + FRAMING_PICKER_PAGE_SIZE, FRAMING_PICKER_MAX_LIMIT)),
    [],
  );

  return (
    <aside className="framing-left-panel">
      <div className="framing-panel-header">
        <Link to="/thoughts/framings" className="framing-panel-back">← Framings</Link>
        {editing ? (
          <input
            ref={titleInputRef}
            className="framing-panel-title-input"
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTitle();
              if (event.key === "Escape") { setEditing(false); setEditValue(framingName); }
            }}
            onBlur={commitTitle}
          />
        ) : (
          <h1
            className={`framing-panel-title${isAdmin ? " editable" : ""}`}
            onDoubleClick={() => { if (isAdmin) setEditing(true); }}
            title={isAdmin ? "Double-click to rename" : undefined}
          >{framingName}</h1>
        )}
        {isAdmin ? (
          <label className="thought-private-toggle framing-panel-privacy">
            <input
              type="checkbox"
              checked={framingPrivate}
              onChange={(event) => onPrivacyChange(event.target.checked)}
            />
            <span aria-hidden="true" />
            Private
          </label>
        ) : null}
      </div>

      <div className="framing-panel-tabs" role="tablist">
        {ITEM_KINDS.map((kind) => {
          const profile = ITEM_KIND_PROFILES[kind];
          return (
            <button
              type="button"
              key={kind}
              role="tab"
              aria-selected={tab === kind}
              className={`framing-panel-tab${tab === kind ? " active" : ""}`}
              onClick={() => selectTab(kind)}
              title={profile.code ? `${profile.plural} (${profile.code})` : profile.plural}
            >{profile.plural}</button>
          );
        })}
      </div>
      <div className="framing-panel-search">
        <input
          type="search"
          className="framing-panel-search-input"
          placeholder={`Search ${ITEM_KIND_PROFILES[tab].plural.toLocaleLowerCase()}…`}
          value={query}
          onChange={(event) => updateSearch(event.target.value)}
        />
        {query ? (
          <button type="button" className="framing-panel-search-clear" onClick={() => updateSearch("")} aria-label="Clear search">×</button>
        ) : null}
      </div>

      <div className="framing-panel-list">
        <ActivePicker
          kind={tab}
          framingId={framingId}
          props={{
            search: debouncedQuery,
            limit,
            onLoadMore: loadMore,
            editable: isAdmin,
            placedItemKeys,
          }}
        />
      </div>
      {!isAdmin ? <p className="framing-panel-readonly">Sign in as admin to edit this framing.</p> : null}
    </aside>
  );
}
