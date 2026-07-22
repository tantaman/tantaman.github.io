import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { ulid } from "ulid";

import { commentAuthorName } from "../../shared/auth.ts";
import { authClient } from "../auth-client.ts";
import { formatThoughtTime, thoughtDateTime } from "../lib/thoughts.ts";
import { useHydrated } from "../lib/hydration.ts";
import { app } from "../rindle-client.ts";
import {
  POST_COMMENTS_MAX_LIMIT,
  POST_COMMENTS_PAGE_SIZE,
  postCommentsQuery,
  type PostCommentRow,
} from "./PostComments.queries.ts";

interface CommentNode {
  comment: PostCommentRow;
  children: CommentNode[];
}

function buildCommentTree(comments: readonly PostCommentRow[]): CommentNode[] {
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

interface CommentComposerProps {
  postId: string;
  parentId: string | null;
  authorName: string;
  onCancel?: () => void;
  onSubmitted: () => void;
}

function CommentComposer({
  postId,
  parentId,
  authorName,
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
      app.mutate.createPostComment({
        comment: {
          id: ulid(),
          postId,
          authorName,
          parentId,
          body: trimmed,
          createdAt: Date.now(),
        },
      });
      setBody("");
      onSubmitted();
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
      <label htmlFor={hintId}>{parentId ? "Write a reply" : `Comment as ${authorName}`}</label>
      <textarea
        id={hintId}
        value={body}
        rows={parentId ? 3 : 4}
        maxLength={10_000}
        autoFocus={parentId !== null}
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
}

function CommentItem({
  node,
  depth,
  currentUserId,
  authorName,
  replyingTo,
  setReplyingTo,
  onSubmitted,
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
      app.mutate.deletePostComment({ id: comment.id, deletedAt: Date.now() });
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
                postId={comment.postId}
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
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PostComments({ postId }: { postId: string }) {
  const [limit, setLimit] = useState(POST_COMMENTS_PAGE_SIZE);
  const [allComments, { status }] = useRoot(postCommentsQuery, { postId, limit });
  const visibleComments = allComments.slice(0, limit);
  const renderedRef = useRef({ postId, comments: visibleComments });
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  if (
    renderedRef.current.postId !== postId ||
    status === "complete" ||
    visibleComments.length >= renderedRef.current.comments.length
  ) {
    renderedRef.current = { postId, comments: visibleComments };
  }
  const comments = renderedRef.current.comments;
  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const hasMore = limit < POST_COMMENTS_MAX_LIMIT && allComments.length > limit;
  const user = hydrated ? session?.user : undefined;
  const currentAuthorName = user
    ? commentAuthorName({ username: user.username ?? null, displayName: user.name || "reader" })
    : undefined;

  const revealNewComment = () => {
    if (hasMore) setLimit(POST_COMMENTS_MAX_LIMIT);
  };

  return (
    <section className="post-comments" aria-labelledby="post-comments-title">
      <header className="post-comments-head">
        <div>
          <p>conversation</p>
          <h2 id="post-comments-title">Comments</h2>
        </div>
        {comments.length > 0 ? (
          <span>{hasMore ? `${limit}+` : comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
        ) : null}
      </header>

      {user && currentAuthorName ? (
        <CommentComposer
          postId={postId}
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
            />
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          className="post-comments-load-more"
          disabled={status !== "complete"}
          onClick={() => setLimit((current) => Math.min(current + POST_COMMENTS_PAGE_SIZE, POST_COMMENTS_MAX_LIMIT))}
        >
          {status === "complete" ? "Load more comments" : "Loading more comments…"}
        </button>
      ) : null}
    </section>
  );
}
