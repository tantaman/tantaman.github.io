import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { ulid } from "ulid";

import { commentAuthorName } from "../../shared/auth.ts";
import { authClient } from "../auth-client.ts";
import { formatThoughtTime, thoughtDateTime } from "../lib/thoughts.ts";
import { useHydrated } from "../lib/hydration.ts";
import {
  collectText,
  makeAnchor,
  offsetAtPoint,
  offsetOf,
  rangeFromOffsets,
  type TextAnchor,
} from "../lib/text-anchor.ts";
import { useTextAnchors, type LocatedAnchor } from "../lib/use-text-anchors.ts";
import { app } from "../rindle-client.ts";
import {
  PASTE_COMMENTS_MAX_LIMIT,
  PASTE_COMMENTS_PAGE_SIZE,
  pasteCommentsQuery,
  type PasteCommentRow,
} from "./Paste.queries.ts";

interface CommentNode {
  comment: PasteCommentRow;
  children: CommentNode[];
}

function buildCommentTree(comments: readonly PasteCommentRow[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>(
    comments.map((comment) => [comment.id, { comment, children: [] }]),
  );
  const roots: CommentNode[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function anchorOf(comment: PasteCommentRow): TextAnchor | null {
  if (comment.parentId !== null || comment.anchorQuote === null) return null;
  return {
    quote: comment.anchorQuote,
    prefix: comment.anchorPrefix ?? "",
    suffix: comment.anchorSuffix ?? "",
    start: Number(comment.anchorStart ?? 0),
  };
}

function Quote({ text }: { text: string }) {
  const clipped = text.length > 280 ? `${text.slice(0, 280).trimEnd()}…` : text;
  return <span className="paste-inline-quote-text">{clipped}</span>;
}

interface CommentComposerProps {
  pasteId: string;
  parentId: string | null;
  authorName: string;
  anchor?: TextAnchor | null;
  onCancel?: () => void;
  onSubmitted: (id: string) => void;
}

function CommentComposer({
  pasteId,
  parentId,
  authorName,
  anchor = null,
  onCancel,
  onSubmitted,
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hintId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const id = ulid();
      app.mutate.createPasteComment({
        comment: {
          id,
          pasteId,
          authorName,
          parentId,
          body: trimmed,
          createdAt: Date.now(),
          anchor,
        },
      });
      setBody("");
      onSubmitted(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not post that comment.");
    } finally {
      setSubmitting(false);
    }
  }

  function submitFromKeyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className={`post-comment-composer${parentId ? " is-reply" : ""}`} onSubmit={submit}>
      <label htmlFor={hintId}>
        {parentId ? "Write a reply" : anchor ? `Comment on this passage as ${authorName}` : `Comment as ${authorName}`}
      </label>
      <textarea
        id={hintId}
        value={body}
        rows={parentId || anchor ? 3 : 4}
        maxLength={10_000}
        autoFocus={parentId !== null || anchor !== null}
        spellCheck
        placeholder={parentId ? "What do you want to add?" : "Join the conversation…"}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={submitFromKeyboard}
      />
      <div className="post-comment-composer-foot">
        <span>Plain text · Cmd/Ctrl + Enter</span>
        {onCancel ? (
          <button type="button" className="post-comment-button is-quiet" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="post-comment-button is-primary" disabled={submitting || !body.trim()}>
          {submitting ? "Posting…" : parentId ? "Reply" : "Comment"}
        </button>
      </div>
      {error ? <p className="post-comment-error" role="alert">{error}</p> : null}
    </form>
  );
}

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  currentUserId: string | undefined;
  authorName: string | undefined;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  onSubmitted: () => void;
  /** In the full list, an anchored thread shows the passage it is on; clicking it jumps there. */
  onShowAnchor?: (id: string) => void;
  anchorMissing?: (id: string) => boolean;
}

function CommentItem({
  node,
  depth,
  currentUserId,
  authorName,
  replyingTo,
  setReplyingTo,
  onSubmitted,
  onShowAnchor,
  anchorMissing,
}: CommentItemProps) {
  const { comment, children } = node;
  const [collapsed, setCollapsed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleted = comment.deletedAt !== null;
  const ownComment = !deleted && currentUserId === comment.authorId;
  const directReplies = Number(comment.replyCount ?? children.length);

  function deleteComment() {
    setError(null);
    try {
      app.mutate.deletePasteComment({ id: comment.id, deletedAt: Date.now() });
      setConfirmingDelete(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete that comment.");
    }
  }

  return (
    <li className={`post-comment${deleted ? " is-deleted" : ""}`}>
      <article>
        <header>
          <button
            type="button"
            className="post-comment-collapse"
            aria-label={collapsed ? "Expand comment" : "Collapse comment"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "+" : "−"}
          </button>
          <strong>{deleted ? "[deleted]" : comment.authorName}</strong>
          <span aria-hidden="true">·</span>
          <time dateTime={thoughtDateTime(comment.createdAt)}>{formatThoughtTime(comment.createdAt)}</time>
          {collapsed && directReplies > 0 ? (
            <span className="post-comment-collapsed-count">
              {directReplies} {directReplies === 1 ? "reply" : "replies"}
            </span>
          ) : null}
        </header>

        {!collapsed ? (
          <>
            {onShowAnchor && comment.anchorQuote !== null && comment.parentId === null ? (
              anchorMissing?.(comment.id) ? (
                <p className="paste-inline-quote is-missing" title="This passage is no longer in the rendered paste">
                  <Quote text={comment.anchorQuote} />
                </p>
              ) : (
                <button
                  type="button"
                  className="paste-inline-quote"
                  title="Show this passage"
                  onClick={() => onShowAnchor(comment.id)}
                >
                  <Quote text={comment.anchorQuote} />
                </button>
              )
            ) : null}
            <p className="post-comment-body">{deleted ? "This comment was deleted." : comment.body}</p>
            {!deleted || currentUserId ? (
              <div className="post-comment-actions">
                {currentUserId && authorName ? (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    Reply
                  </button>
                ) : null}
                {ownComment && !confirmingDelete ? (
                  <button type="button" onClick={() => setConfirmingDelete(true)}>Delete</button>
                ) : null}
                {ownComment && confirmingDelete ? (
                  <>
                    <button type="button" className="is-danger" onClick={deleteComment}>Delete comment?</button>
                    <button type="button" onClick={() => setConfirmingDelete(false)}>Cancel</button>
                  </>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="post-comment-error" role="alert">{error}</p> : null}
            {replyingTo === comment.id && currentUserId && authorName ? (
              <CommentComposer
                pasteId={comment.pasteId}
                parentId={comment.id}
                authorName={authorName}
                onCancel={() => setReplyingTo(null)}
                onSubmitted={() => {
                  setReplyingTo(null);
                  onSubmitted();
                }}
              />
            ) : null}
          </>
        ) : null}
      </article>

      {!collapsed && children.length > 0 ? (
        <ul className="post-comment-children" style={depth >= 7 ? { marginLeft: 0 } : undefined}>
          {children.map((child) => (
            <CommentItem
              key={child.comment.id}
              node={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              authorName={authorName}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onSubmitted={onSubmitted}
              onShowAnchor={onShowAnchor}
              anchorMissing={anchorMissing}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type Popover =
  | { kind: "new"; anchor: TextAnchor; range: Range }
  | { kind: "thread"; id: string };

interface PendingSelection {
  anchor: TextAnchor;
  range: Range;
}

const POPOVER_WIDTH = 380;
const EDGE = 16;

/** Document coordinates just below a range, clamped so a box of `width` stays on screen. */
function placeBelow(range: Range, width: number, alignEnd: boolean): { top: number; left: number } {
  const rects = range.getClientRects();
  const rect = (alignEnd ? rects[rects.length - 1] : rects[0]) ?? range.getBoundingClientRect();
  const x = alignEnd ? rect.right - width / 2 : rect.left;
  const left = Math.min(Math.max(EDGE, x), window.innerWidth - width - EDGE);
  return { top: rect.bottom + window.scrollY + 8, left: Math.max(EDGE, left) + window.scrollX };
}

/** Selecting text in the paste body offers a "Comment" button; the saved comment becomes a thread
 *  anchored to that passage. Clicking a highlighted passage opens its thread in a popover. */
function useSelectionAnchor(
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): [PendingSelection | null, () => void] {
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const clear = useCallback(() => setPending(null), []);

  useEffect(() => {
    if (!enabled) return;
    let pointerDown = false;
    let frame = 0;

    const read = () => {
      frame = 0;
      const root = contentRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setPending(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        setPending(null);
        return;
      }
      const map = collectText(root);
      let start = offsetOf(map, range.startContainer, range.startOffset);
      let end = offsetOf(map, range.endContainer, range.endOffset);
      if (start === null || end === null) {
        setPending(null);
        return;
      }
      while (start < end && /\s/.test(map.text[start])) start++;
      while (end > start && /\s/.test(map.text[end - 1])) end--;
      if (end <= start) {
        setPending(null);
        return;
      }
      const trimmed = rangeFromOffsets(map, start, end);
      setPending(trimmed ? { anchor: makeAnchor(map.text, start, end), range: trimmed } : null);
    };
    const schedule = () => {
      if (!pointerDown && !frame) frame = requestAnimationFrame(read);
    };
    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest?.(".paste-inline-ui")) return;
      pointerDown = true;
    };
    const onPointerUp = () => {
      pointerDown = false;
      schedule();
    };

    document.addEventListener("selectionchange", schedule);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [contentRef, enabled]);

  return [pending, clear];
}

export function PasteComments({
  pasteId,
  contentRef,
  anchorable,
}: {
  pasteId: string;
  /** The rendered paste body that inline comments anchor to. */
  contentRef: RefObject<HTMLElement | null>;
  /** False for bodies that render in an iframe (HTML, JSX): their text is out of reach. */
  anchorable: boolean;
}) {
  const [limit, setLimit] = useState(PASTE_COMMENTS_PAGE_SIZE);
  const [allComments, { status }] = useRoot(pasteCommentsQuery, { pasteId, limit });
  const visibleComments = allComments.slice(0, limit);
  const renderedRef = useRef({ pasteId, comments: visibleComments });
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [popoverReplyingTo, setPopoverReplyingTo] = useState<string | null>(null);

  if (
    renderedRef.current.pasteId !== pasteId ||
    status === "complete" ||
    visibleComments.length >= renderedRef.current.comments.length
  ) {
    renderedRef.current = { pasteId, comments: visibleComments };
  }
  const comments = renderedRef.current.comments;
  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const hasMore = limit < PASTE_COMMENTS_MAX_LIMIT && allComments.length > limit;
  const user = hydrated ? session?.user : undefined;
  const currentAuthorName = user
    ? commentAuthorName({ username: user.username ?? null, displayName: user.name || "reader" })
    : undefined;

  // A deleted thread with nothing under it has nothing left to show, so its passage goes quiet.
  const anchors = useMemo(
    () =>
      anchorable
        ? comments.flatMap((comment) => {
            const anchor = anchorOf(comment);
            const empty = comment.deletedAt !== null && Number(comment.replyCount ?? 0) === 0;
            return anchor && !empty ? [{ id: comment.id, anchor }] : [];
          })
        : [],
    [anchorable, comments],
  );
  const { located, textMap } = useTextAnchors(
    contentRef,
    anchors,
    popover?.kind === "thread" ? popover.id : null,
    popover?.kind === "new" ? popover.range : null,
  );
  const [pending, clearPending] = useSelectionAnchor(contentRef, anchorable && hydrated);

  const openThread = useCallback((id: string) => {
    setPopoverReplyingTo(null);
    setPopover({ kind: "thread", id });
  }, []);

  // Clicking a highlighted passage opens its thread; hovering one shows it is clickable.
  const locatedRef = useRef(located);
  locatedRef.current = located;
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !anchorable) return;
    const hit = (event: MouseEvent): LocatedAnchor & { id: string } | null => {
      const map = textMap.current;
      if (!map || locatedRef.current.size === 0) return null;
      const offset = offsetAtPoint(map, event.clientX, event.clientY);
      if (offset === null) return null;
      let best: (LocatedAnchor & { id: string }) | null = null;
      for (const [id, at] of locatedRef.current) {
        if (at.start <= offset && offset < at.end && (!best || at.end - at.start < best.end - best.start)) {
          best = { id, ...at };
        }
      }
      return best;
    };
    const onClick = (event: MouseEvent) => {
      if (!window.getSelection()?.isCollapsed) return;
      if ((event.target as Element).closest("a")) return;
      const found = hit(event);
      if (found) openThread(found.id);
    };
    let frame = 0;
    const onMove = (event: MouseEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.classList.toggle("is-over-anchor", hit(event) !== null);
      });
    };
    root.addEventListener("click", onClick);
    root.addEventListener("mousemove", onMove);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove("is-over-anchor");
    };
  }, [contentRef, anchorable, textMap, openThread]);

  // Escape closes the popover; clicking elsewhere closes a thread (never an unsaved draft).
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!popover) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (popover.kind !== "thread") return;
      if (popoverRef.current?.contains(event.target as Node)) return;
      setPopover(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [popover]);

  const popoverRange =
    popover?.kind === "new" ? popover.range : popover ? located.get(popover.id)?.range ?? null : null;
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!popoverRange) return;
    const place = () => setPopoverPosition(placeBelow(popoverRange, Math.min(POPOVER_WIDTH, window.innerWidth - 2 * EDGE), false));
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [popoverRange]);

  const revealNewComment = () => {
    if (hasMore) setLimit(PASTE_COMMENTS_MAX_LIMIT);
  };

  function startInlineComment() {
    if (!pending) return;
    setPopover({ kind: "new", anchor: pending.anchor, range: pending.range });
    window.getSelection()?.removeAllRanges();
    clearPending();
  }

  function showAnchor(id: string) {
    const target = located.get(id);
    if (!target) return;
    target.range.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    openThread(id);
  }

  const threadNode = popover?.kind === "thread" ? tree.find((node) => node.comment.id === popover.id) : undefined;

  const inlineUi = hydrated
    ? createPortal(
        <>
          {pending && popover?.kind !== "new" ? (
            <div
              className="paste-inline-ui paste-inline-trigger"
              style={placeBelow(pending.range, 150, true)}
              onMouseDown={(event) => event.preventDefault()}
            >
              {user && currentAuthorName ? (
                <button type="button" onClick={startInlineComment}>Comment</button>
              ) : (
                <Link to="/login">Sign in to comment</Link>
              )}
            </div>
          ) : null}
          {popover && popoverPosition && (popover.kind === "new" || threadNode) ? (
            <div
              ref={popoverRef}
              className="paste-inline-ui paste-inline-popover"
              role="dialog"
              aria-label={popover.kind === "new" ? "Comment on passage" : "Passage thread"}
              style={{ ...popoverPosition, width: Math.min(POPOVER_WIDTH, window.innerWidth - 2 * EDGE) }}
            >
              <header>
                <p className="paste-inline-quote is-static">
                  <Quote text={popover.kind === "new" ? popover.anchor.quote : threadNode!.comment.anchorQuote ?? ""} />
                </p>
                <button type="button" className="paste-inline-close" aria-label="Close" onClick={() => setPopover(null)}>
                  ×
                </button>
              </header>
              {popover.kind === "new" && user && currentAuthorName ? (
                <CommentComposer
                  pasteId={pasteId}
                  parentId={null}
                  authorName={currentAuthorName}
                  anchor={popover.anchor}
                  onCancel={() => setPopover(null)}
                  onSubmitted={(id) => {
                    revealNewComment();
                    openThread(id);
                  }}
                />
              ) : threadNode ? (
                <ul className="post-comment-thread">
                  <CommentItem
                    node={threadNode}
                    depth={0}
                    currentUserId={user?.id}
                    authorName={currentAuthorName}
                    replyingTo={popoverReplyingTo}
                    setReplyingTo={setPopoverReplyingTo}
                    onSubmitted={revealNewComment}
                  />
                </ul>
              ) : null}
            </div>
          ) : null}
        </>,
        document.body,
      )
    : null;

  return (
    <section className="post-comments" aria-labelledby="post-comments-title">
      {inlineUi}
      <header className="post-comments-head">
        <div>
          <p>conversation</p>
          <h2 id="post-comments-title">Comments</h2>
        </div>
        {comments.length > 0 ? (
          <span>{hasMore ? `${limit}+` : comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
        ) : null}
      </header>

      {anchorable ? (
        <p className="paste-inline-hint">Select any passage above to comment on it inline.</p>
      ) : null}

      {user && currentAuthorName ? (
        <CommentComposer
          pasteId={pasteId}
          parentId={null}
          authorName={currentAuthorName}
          onSubmitted={revealNewComment}
        />
      ) : (
        <p className="post-comments-sign-in">
          <Link to="/login">Sign in</Link> to join the conversation.
        </p>
      )}

      {comments.length === 0 && status !== "complete" ? (
        <p className="post-comments-empty">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="post-comments-empty">No comments yet. Start the thread.</p>
      ) : (
        <ul className="post-comment-thread">
          {tree.map((node) => (
            <CommentItem
              key={node.comment.id}
              node={node}
              depth={0}
              currentUserId={user?.id}
              authorName={currentAuthorName}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onSubmitted={revealNewComment}
              onShowAnchor={anchorable ? showAnchor : undefined}
              anchorMissing={(id) => !located.has(id)}
            />
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          className="post-comments-load-more"
          disabled={status !== "complete"}
          onClick={() => setLimit((current) => Math.min(current + PASTE_COMMENTS_PAGE_SIZE, PASTE_COMMENTS_MAX_LIMIT))}
        >
          {status === "complete" ? "Load more comments" : "Loading more comments…"}
        </button>
      ) : null}
    </section>
  );
}
