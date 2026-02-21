import { useState, useEffect, useRef, type FormEvent } from 'react';
import { fetchComments, postComment, type Comment } from './api';

const STORAGE_KEY = 'comments-author-name';

export function App() {
  const slug = window.location.pathname;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);

  useEffect(() => {
    fetchComments(slug)
      .then(setComments)
      .catch(() => setError('Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (
    name: string,
    body: string,
    parentId: number | null,
  ) => {
    setError('');
    const comment = await postComment(slug, name, body, parentId, '');
    if (comment) {
      setComments((prev) => [...prev, comment]);
      setReplyTo(null);
    } else {
      setError('Failed to post comment. Please try again.');
    }
  };

  if (loading) {
    return <div className="comments-loading">Loading comments...</div>;
  }

  const topLevel = comments.filter((c) => c.parent_id === null);
  const replyMap = new Map<number, Comment[]>();
  for (const c of comments) {
    if (c.parent_id != null) {
      const existing = replyMap.get(c.parent_id) || [];
      existing.push(c);
      replyMap.set(c.parent_id, existing);
    }
  }

  return (
    <div className="comments-section">
      <h3 className="comments-title">Comments</h3>
      {error && <p className="comments-error">{error}</p>}
      {topLevel.length === 0 && !error && (
        <p className="comments-empty">No comments yet. Be the first!</p>
      )}
      <div className="comments-list">
        {topLevel.map((c) => (
          <CommentNode
            key={c.id}
            comment={c}
            replyMap={replyMap}
            replyTo={replyTo}
            onReply={setReplyTo}
            onSubmit={handleSubmit}
          />
        ))}
      </div>
      <CommentForm
        onSubmit={(name, body) => handleSubmit(name, body, null)}
      />
    </div>
  );
}

function CommentNode({
  comment,
  replyMap,
  replyTo,
  onReply,
  onSubmit,
}: {
  comment: Comment;
  replyMap: Map<number, Comment[]>;
  replyTo: number | null;
  onReply: (id: number | null) => void;
  onSubmit: (name: string, body: string, parentId: number | null) => void;
}) {
  const childReplies = replyMap.get(comment.id) || [];
  const date = new Date(comment.created_at * 1000);

  return (
    <div className="comment">
      <div className="comment-header">
        <span className="comment-author">{comment.author_name}</span>
        <span className="comment-date">
          {date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
      <div className="comment-body">{comment.body}</div>
      <button className="comment-reply-btn" onClick={() => onReply(comment.id)}>
        Reply
      </button>
      {replyTo === comment.id && (
        <CommentForm
          onSubmit={(name, body) => onSubmit(name, body, comment.id)}
          onCancel={() => onReply(null)}
        />
      )}
      {childReplies.length > 0 && (
        <div className="comment-replies">
          {childReplies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              replyMap={replyMap}
              replyTo={replyTo}
              onReply={onReply}
              onSubmit={onSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, body: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(
    () => localStorage.getItem(STORAGE_KEY) || '',
  );
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hpRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedBody = body.trim();
    if (!trimmedName || !trimmedBody) return;

    // If honeypot is filled, silently do nothing
    if (hpRef.current?.value) return;

    localStorage.setItem(STORAGE_KEY, trimmedName);
    setSubmitting(true);
    await onSubmit(trimmedName, trimmedBody);
    setBody('');
    setSubmitting(false);
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
      />
      {/* Honeypot field - hidden from real users */}
      <input
        type="text"
        ref={hpRef}
        name="url"
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
      />
      <textarea
        placeholder="Write a comment..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        maxLength={2000}
      />
      <div className="comment-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
