import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { renderThoughtMarkdown } from "../../lib/thoughts.ts";
import {
  FRAMINGS_LIMIT,
  FRAMING_PICKER_MAX_LIMIT,
  FRAMING_PICKER_PAGE_SIZE,
  framingAdminThoughtsQuery,
  framingPostsQuery,
  framingThoughtsQuery,
  framingsQuery,
  type FramingAdminThoughtPickerRow,
  type FramingPostPickerRow,
  type FramingThoughtPickerRow,
  type FramingsRow,
} from "../Framing.queries.ts";

type PickerTab = "thoughts" | "posts" | "framings";
type ThoughtPickerRow = FramingThoughtPickerRow | FramingAdminThoughtPickerRow;

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function ThoughtItem({ thought, placed, editable }: { thought: ThoughtPickerRow; placed: boolean; editable: boolean }) {
  return (
    <div
      className={`framing-panel-thought${placed ? " placed" : ""}`}
      style={thought.color ? { borderLeftColor: thought.color } : undefined}
      draggable={editable && !placed}
      onDragStart={(event) => {
        if (!editable || placed) { event.preventDefault(); return; }
        event.dataTransfer.setData("application/node-type", "thought");
        event.dataTransfer.setData("application/item-id", thought.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
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
      draggable={editable && !placed}
      onDragStart={(event) => {
        if (!editable || placed) { event.preventDefault(); return; }
        event.dataTransfer.setData("application/node-type", "post");
        event.dataTransfer.setData("application/item-id", post.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
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
      draggable={editable && !placed}
      onDragStart={(event) => {
        if (!editable || placed) { event.preventDefault(); return; }
        event.dataTransfer.setData("application/node-type", "framing");
        event.dataTransfer.setData("application/item-id", framing.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      <span aria-hidden="true">⌘</span>
      <div className="framing-panel-framing-title">{framing.name || "Untitled"}</div>
    </div>
  );
}

export function FramingLeftPanel({
  framingId,
  framingName,
  placedItemKeys,
  isAdmin,
  onRename,
}: {
  framingId: string;
  framingName: string;
  placedItemKeys: Set<string>;
  isAdmin: boolean;
  onRename: (name: string) => void;
}) {
  const [tab, setTab] = useState<PickerTab>("thoughts");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [limit, setLimit] = useState(FRAMING_PICKER_PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(framingName);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const thoughtPickerQuery = isAdmin ? framingAdminThoughtsQuery : framingThoughtsQuery;
  const [thoughtRows, { status: thoughtStatus }] = useRoot(thoughtPickerQuery, { search: debouncedQuery, limit });
  const [postRows, { status: postStatus }] = useRoot(framingPostsQuery, { search: debouncedQuery, limit });
  const [allFramings, { status: framingStatus }] = useRoot(framingsQuery, { limit: FRAMINGS_LIMIT });
  const thoughts = thoughtRows.slice(0, limit) as readonly ThoughtPickerRow[];
  const posts = postRows.slice(0, limit) as readonly FramingPostPickerRow[];
  const framings = useMemo(() => {
    const needle = debouncedQuery.trim().toLocaleLowerCase();
    return (allFramings as readonly FramingsRow[]).filter((frame) =>
      frame.id !== framingId && (!needle || frame.name.toLocaleLowerCase().includes(needle)),
    );
  }, [allFramings, debouncedQuery, framingId]);

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

  function selectTab(next: PickerTab) {
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

  const status = tab === "thoughts" ? thoughtStatus : tab === "posts" ? postStatus : framingStatus;
  const itemCount = tab === "thoughts" ? thoughts.length : tab === "posts" ? posts.length : framings.length;
  const hasMore = tab === "thoughts"
    ? thoughtRows.length > limit
    : tab === "posts"
      ? postRows.length > limit
      : false;

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
      </div>

      <div className="framing-panel-tabs">
        {(["thoughts", "posts", "framings"] as const).map((value) => (
          <button
            type="button"
            key={value}
            className={`framing-panel-tab${tab === value ? " active" : ""}`}
            onClick={() => selectTab(value)}
          >{value[0].toUpperCase() + value.slice(1)}</button>
        ))}
      </div>
      <div className="framing-panel-search">
        <input
          type="search"
          className="framing-panel-search-input"
          placeholder={`Search ${tab}…`}
          value={query}
          onChange={(event) => updateSearch(event.target.value)}
        />
        {query ? (
          <button type="button" className="framing-panel-search-clear" onClick={() => updateSearch("")} aria-label="Clear search">×</button>
        ) : null}
      </div>

      <div className="framing-panel-list">
        {tab === "thoughts" ? thoughts.map((thought) => (
          <ThoughtItem key={thought.id} thought={thought} editable={isAdmin} placed={placedItemKeys.has(`thought:${thought.id}`)} />
        )) : null}
        {tab === "posts" ? posts.map((post) => (
          <PostItem key={post.id} post={post} editable={isAdmin} placed={placedItemKeys.has(`post:${post.id}`)} />
        )) : null}
        {tab === "framings" ? framings.map((frame) => (
          <FramingItem key={frame.id} framing={frame} editable={isAdmin} placed={placedItemKeys.has(`framing:${frame.id}`)} />
        )) : null}
        {itemCount === 0 ? (
          <div className="framing-panel-status">{status === "complete" ? `No ${tab} found` : "Loading…"}</div>
        ) : null}
        {hasMore && limit < FRAMING_PICKER_MAX_LIMIT ? (
          <button
            type="button"
            className="framing-panel-load-more"
            onClick={() => setLimit((value) => Math.min(value + FRAMING_PICKER_PAGE_SIZE, FRAMING_PICKER_MAX_LIMIT))}
            disabled={status !== "complete"}
          >{status === "complete" ? "Load more" : "Loading…"}</button>
        ) : null}
      </div>
      {!isAdmin ? <p className="framing-panel-readonly">Sign in as admin to edit this framing.</p> : null}
    </aside>
  );
}
