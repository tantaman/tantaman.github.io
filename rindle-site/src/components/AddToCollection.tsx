// The "add to…" control: put an item into a collection from wherever you are already looking at it.
//
// This is the affordance that makes collections quick. Without it, filing something means leaving
// the feed, opening a collection, finding the item again in the picker, and dragging it — you
// re-find what you were just reading. Here the item is the subject and the collection is the
// choice, which is the way round it actually happens.
//
// The popover stays open after a hit, because filing one thing under three headings is one gesture,
// not three.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRoot } from "@rindle/react";
import { ulid } from "ulid";

import { app, currentQueryContext } from "../rindle-client.ts";
import type { ItemKind } from "../../shared/item-kinds.ts";
import {
  FRAMINGS_LIMIT,
  framingsQuery,
  itemCollectionsQuery,
  type FramingsRow,
  type ItemCollectionsRow,
} from "./Framing.queries.ts";

/** Items filed from here scatter inside a modest region rather than stacking on the origin, so a
 *  collection that is later opened as a canvas is untidy instead of a single pile — and the canvas
 *  already has a Layout button for untidy. */
function scatter() {
  return { x: Math.round(Math.random() * 820), y: Math.round(Math.random() * 520) };
}

export function AddToCollection({
  kind,
  itemId,
  isAdmin,
  defaultPrivate = false,
}: {
  kind: ItemKind;
  itemId: string;
  isAdmin: boolean;
  /** A collection minted from a private item starts private; nothing is quietly published by being
   *  filed. */
  defaultPrivate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return open
    ? <AddToCollectionPopover
        kind={kind}
        itemId={itemId}
        defaultPrivate={defaultPrivate}
        onClose={() => setOpen(false)}
      />
    : (
      <span className="add-to">
        <button
          type="button"
          className="add-to-trigger"
          aria-label="Add to a collection"
          title="Add to a collection"
          onClick={() => setOpen(true)}
        >⊞</button>
      </span>
    );
}

/** Split out so the queries below only subscribe while the popover is actually open — the control
 *  appears on every card in a feed, and a feed is a lot of cards. */
function AddToCollectionPopover({
  kind,
  itemId,
  defaultPrivate,
  onClose,
}: {
  kind: ItemKind;
  itemId: string;
  defaultPrivate: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const [framingRows] = useRoot(framingsQuery, { limit: FRAMINGS_LIMIT }, currentQueryContext());
  const [memberRows] = useRoot(itemCollectionsQuery, { itemType: kind, itemId }, currentQueryContext());

  const placed = useMemo(
    () => new Set((memberRows as readonly ItemCollectionsRow[]).map((row) => row.framingId)),
    [memberRows],
  );

  const needle = query.trim().toLocaleLowerCase();
  const matches = useMemo(() => {
    const all = framingRows as readonly FramingsRow[];
    return needle ? all.filter((frame) => frame.name.toLocaleLowerCase().includes(needle)) : all;
  }, [framingRows, needle]);

  // Offer to mint one only when nothing already carries that exact name.
  const exact = matches.some((frame) => frame.name.toLocaleLowerCase() === needle);
  const canCreate = needle.length > 0 && !exact;
  const rowCount = matches.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setActive(0);
  }, [needle]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  const addTo = useCallback((framingId: string) => {
    const now = Date.now();
    const { x, y } = scatter();
    app.mutate.addFramingNode({
      node: {
        id: ulid(),
        framingId,
        itemType: kind,
        itemId,
        x,
        y,
        width: null,
        height: null,
        // Ordering by the clock appends without reading the collection first.
        position: now,
      },
      updatedAt: now,
    });
  }, [itemId, kind]);

  const createAndAdd = useCallback((name: string) => {
    const now = Date.now();
    const framingId = ulid();
    // Minted from here, a collection is a pile until its author says otherwise.
    app.mutate.createFraming({
      framing: {
        id: framingId,
        name,
        description: null,
        private: defaultPrivate ? 1 : 0,
        defaultView: "board",
        createdAt: now,
        updatedAt: now,
      },
    });
    addTo(framingId);
    setQuery("");
  }, [addTo, defaultPrivate]);

  const choose = useCallback((index: number) => {
    if (index < matches.length) {
      const frame = matches[index];
      if (frame && !placed.has(frame.id)) addTo(frame.id);
      return;
    }
    if (canCreate) createAndAdd(query.trim());
  }, [addTo, canCreate, createAndAdd, matches, placed, query]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => (rowCount ? (i + 1) % rowCount : 0)); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => (rowCount ? (i - 1 + rowCount) % rowCount : 0)); return; }
    if (event.key === "Enter") { event.preventDefault(); choose(active); }
  }

  return (
    <span className="add-to is-open" ref={wrapRef}>
      <button
        type="button"
        className="add-to-trigger is-open"
        aria-label="Close collection picker"
        onClick={onClose}
      >⊞</button>
      <div className="add-to-pop" role="dialog" aria-label="Add to a collection">
        <input
          type="search"
          className="add-to-search"
          aria-label="Search collections, or type a new name"
          placeholder="Add to collection…"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="add-to-list">
          {matches.map((frame, index) => {
            const already = placed.has(frame.id);
            return (
              <button
                type="button"
                key={frame.id}
                className={`add-to-row${index === active ? " is-active" : ""}${already ? " is-placed" : ""}`}
                disabled={already}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span className="add-to-row-name">{frame.name || "Untitled"}</span>
                {frame.private === 1 ? <span className="framing-privacy-badge">private</span> : null}
                <span className="add-to-row-mark" aria-hidden="true">{already ? "✓" : "+"}</span>
              </button>
            );
          })}
          {canCreate ? (
            <button
              type="button"
              className={`add-to-row add-to-create${active === matches.length ? " is-active" : ""}`}
              onMouseEnter={() => setActive(matches.length)}
              onClick={() => choose(matches.length)}
            >
              <span className="add-to-row-name">New collection “{query.trim()}”</span>
              <span className="add-to-row-mark" aria-hidden="true">+</span>
            </button>
          ) : null}
          {rowCount === 0 ? <div className="add-to-empty">No collections yet — type a name to make one.</div> : null}
        </div>
      </div>
    </span>
  );
}
