import { useCallback, useState, type CSSProperties, type DragEvent as ReactDragEvent } from "react";
import { Link } from "@tanstack/react-router";

import { app } from "../../rindle-client.ts";
import { parseList } from "../../lib/format.ts";
import { renderThoughtMarkdown } from "../../lib/thoughts.ts";
import { attachmentPreviewUrl, isPreviewableImage } from "../../lib/attachments.ts";
import { isItemKind } from "../../../shared/item-kinds.ts";
import { ItemCard } from "../ItemCard.tsx";
import { FramingLeftPanel, type FramingViewName } from "./FramingLeftPanel.tsx";
import { useFramingBoard, type BoardItem } from "./useFramingBoard.ts";

const BODY_MAX = 420;
const SUMMARY_MAX = 200;

/** The dragged board card. Reordering and adding arrive through different payloads so a drop can
 *  tell "move this card" from "place this item", and the panel's existing drag contract is reused
 *  untouched. */
const BOARD_NODE = "application/board-node";
const ITEM_KIND = "application/node-type";
const ITEM_ID = "application/item-id";

function BoardCardBody({ item, isAdmin }: { item: BoardItem; isAdmin: boolean }) {
  const { target } = item;
  if (target.kind === "thought") {
    const thought = target.thought;
    const body = thought.body.length > BODY_MAX ? `${thought.body.slice(0, BODY_MAX)}…` : thought.body;
    const images = (thought.attachments ?? []).filter((attachment) => isPreviewableImage(attachment.mediaType));
    return (
      <>
        <div
          className="thought-markdown framing-board-thought-body"
          dangerouslySetInnerHTML={{ __html: renderThoughtMarkdown(body) }}
        />
        {images.length > 0 ? (
          <div className="framing-board-images">
            {images.map((attachment) => (
              <img
                key={attachment.id}
                src={attachmentPreviewUrl(attachment.storageKey)}
                alt={attachment.fileName}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        ) : null}
        <div className="framing-board-foot">
          <Link className="framing-board-open" to="/thoughts/$id" params={{ id: thought.id }}>open →</Link>
          {thought.replyCount ? <span>{thought.replyCount} replies</span> : null}
          {thought.private === 1 && isAdmin ? <span className="framing-privacy-badge">private</span> : null}
        </div>
      </>
    );
  }
  if (target.kind === "post") {
    const post = target.post;
    const summary = post.description.length > SUMMARY_MAX
      ? `${post.description.slice(0, SUMMARY_MAX)}…`
      : post.description;
    const tags = parseList(post.tags);
    return (
      <>
        <a className="framing-board-post-title nodrag" href={`/${post.id}`} target="_blank" rel="noreferrer">
          {post.title}
        </a>
        {post.date ? <div className="framing-board-post-date">{post.date}</div> : null}
        {summary ? <div className="framing-board-post-summary">{summary}</div> : null}
        {tags.length > 0 ? (
          <div className="framing-post-node-tags">
            {tags.map((tag) => <span className="framing-post-node-tag" key={tag}>{tag}</span>)}
          </div>
        ) : null}
      </>
    );
  }
  if (target.kind === "framing") {
    const nested = target.nested;
    return (
      <div className="framing-board-nested">
        <span aria-hidden="true">⌘</span>
        <Link to="/thoughts/framings/$id" params={{ id: nested.id }} className="framing-board-nested-title">
          {nested.name || "Untitled framing"}
        </Link>
        {nested.private === 1 ? <span className="framing-privacy-badge">private</span> : null}
      </div>
    );
  }
  return <ItemCard target={target.target} />;
}

function BoardCard({
  item,
  isAdmin,
  isDropTarget,
  onRemove,
  onDragStart,
  onDragOverCard,
  onDropCard,
  onDragLeaveCard,
}: {
  item: BoardItem;
  isAdmin: boolean;
  isDropTarget: boolean;
  onRemove: (nodeId: string) => void;
  onDragStart: (nodeId: string, event: ReactDragEvent<HTMLElement>) => void;
  onDragOverCard: (nodeId: string, event: ReactDragEvent<HTMLElement>) => void;
  onDropCard: (nodeId: string, event: ReactDragEvent<HTMLElement>) => void;
  onDragLeaveCard: () => void;
}) {
  const hue = item.target.kind === "item" ? ` item-hue--${item.target.target.kind}` : "";
  const style = item.target.kind === "thought" && item.target.thought.color
    ? ({ "--item-color": item.target.thought.color } as CSSProperties)
    : undefined;
  return (
    <article
      className={`framing-board-card framing-board-card--${item.target.kind}${hue}${isDropTarget ? " is-drop-target" : ""}`}
      style={style}
      draggable={isAdmin}
      onDragStart={(event) => onDragStart(item.nodeId, event)}
      onDragOver={(event) => onDragOverCard(item.nodeId, event)}
      onDrop={(event) => onDropCard(item.nodeId, event)}
      onDragLeave={onDragLeaveCard}
    >
      {isAdmin ? (
        <button
          type="button"
          className="framing-node-remove nodrag"
          onClick={() => onRemove(item.nodeId)}
          title="Remove from framing"
        >×</button>
      ) : null}
      <BoardCardBody item={item} isAdmin={isAdmin} />
    </article>
  );
}

export function FramingBoardView({
  id,
  isAdmin,
  view,
  onViewChange,
}: {
  id: string;
  isAdmin: boolean;
  view: FramingViewName;
  onViewChange: (view: FramingViewName) => void;
}) {
  const {
    framing,
    items,
    placedItemKeys,
    addItem,
    removeItem,
    moveItem,
    loading,
    missing,
  } = useFramingBoard(id, isAdmin);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const rename = useCallback((name: string) => {
    if (!isAdmin) return;
    app.mutate.updateFraming({ id, name, updatedAt: Date.now() });
  }, [id, isAdmin]);

  const setPrivacy = useCallback((isPrivate: boolean) => {
    if (!isAdmin) return;
    app.mutate.updateFraming({ id, private: isPrivate ? 1 : 0, updatedAt: Date.now() });
  }, [id, isAdmin]);

  const onDragStart = useCallback((nodeId: string, event: ReactDragEvent<HTMLElement>) => {
    if (!isAdmin) { event.preventDefault(); return; }
    event.dataTransfer.setData(BOARD_NODE, nodeId);
    event.dataTransfer.effectAllowed = "move";
  }, [isAdmin]);

  /** `getData` is unavailable during dragover, so the decision to accept a drop is made from the
   *  payload's declared types. */
  const accepts = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const types = event.dataTransfer.types;
    return isAdmin && (types.includes(BOARD_NODE) || types.includes(ITEM_KIND));
  }, [isAdmin]);

  const onDragOverCard = useCallback((nodeId: string, event: ReactDragEvent<HTMLElement>) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = event.dataTransfer.types.includes(BOARD_NODE) ? "move" : "copy";
    setDropTarget(nodeId);
  }, [accepts]);

  const place = useCallback((event: ReactDragEvent<HTMLElement>, beforeNodeId: string | null) => {
    setDropTarget(null);
    const movingNodeId = event.dataTransfer.getData(BOARD_NODE);
    if (movingNodeId) {
      moveItem(movingNodeId, beforeNodeId);
      return;
    }
    const itemType = event.dataTransfer.getData(ITEM_KIND);
    const itemId = event.dataTransfer.getData(ITEM_ID);
    // A placement from the picker always appends; sequencing it is a second, deliberate drag.
    if (itemId && isItemKind(itemType)) addItem(itemType, itemId);
  }, [addItem, moveItem]);

  const onDropCard = useCallback((nodeId: string, event: ReactDragEvent<HTMLElement>) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.stopPropagation();
    place(event, nodeId);
  }, [accepts, place]);

  const onDropBoard = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!accepts(event)) return;
    event.preventDefault();
    place(event, null);
  }, [accepts, place]);

  if (loading) return <div className="framing-route-status">Loading framing…</div>;
  if (missing || !framing) return <div className="framing-route-status">Framing not found.</div>;

  return (
    <div className="framing-canvas-wrap">
      <FramingLeftPanel
        framingId={id}
        framingName={framing.name}
        framingPrivate={framing.private === 1}
        placedItemKeys={placedItemKeys}
        isAdmin={isAdmin}
        view={view}
        onViewChange={onViewChange}
        onRename={rename}
        onPrivacyChange={setPrivacy}
      />
      <div
        className="framing-board"
        onDragOver={(event) => {
          if (!accepts(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = event.dataTransfer.types.includes(BOARD_NODE) ? "move" : "copy";
          setDropTarget(null);
        }}
        onDrop={onDropBoard}
      >
        {items.length === 0 ? (
          <div className="thoughts-empty">
            <span aria-hidden="true">◇</span>
            <p>{isAdmin ? "Drag anything from the panel to start this collection." : "Nothing here yet."}</p>
          </div>
        ) : (
          <div className="framing-board-grid">
            {items.map((item) => (
              <BoardCard
                key={item.nodeId}
                item={item}
                isAdmin={isAdmin}
                isDropTarget={dropTarget === item.nodeId}
                onRemove={removeItem}
                onDragStart={onDragStart}
                onDragOverCard={onDragOverCard}
                onDropCard={onDropCard}
                onDragLeaveCard={() => setDropTarget(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
