import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  fetchComments,
  postComment,
  requestCode,
  verifyCode,
  checkSession,
  type Comment,
  type Session,
} from './api';

const SESSION_KEY = 'comments-session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function App() {
  const slug = window.location.pathname;
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [session, setSession] = useState<Session | null>(loadSession);

  useEffect(() => {
    fetchComments(slug)
      .then(setComments)
      .catch(() => setError('Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Validate stored session on mount
  useEffect(() => {
    if (!session) return;
    checkSession(session.session_token).then((result) => {
      if (!result) {
        clearSession();
        setSession(null);
      }
    });
  }, []);

  const handleLogin = (s: Session) => {
    saveSession(s);
    setSession(s);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  const handleSubmit = async (body: string, parentId: number | null) => {
    if (!session) return;
    setError('');
    const comment = await postComment(
      slug,
      body,
      parentId,
      session.session_token,
      '',
    );
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
            session={session}
            onLogin={handleLogin}
          />
        ))}
      </div>
      {session ? (
        <div className="comment-auth-status">
          <span className="comment-auth-name">
            Commenting as <strong>{session.name}</strong>
          </span>
          <button className="comment-sign-out" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      ) : null}
      <CommentFormOrAuth
        session={session}
        onLogin={handleLogin}
        onSubmit={(body) => handleSubmit(body, null)}
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
  session,
  onLogin,
}: {
  comment: Comment;
  replyMap: Map<number, Comment[]>;
  replyTo: number | null;
  onReply: (id: number | null) => void;
  onSubmit: (body: string, parentId: number | null) => void;
  session: Session | null;
  onLogin: (s: Session) => void;
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
      <button
        className="comment-reply-btn"
        onClick={() => onReply(replyTo === comment.id ? null : comment.id)}
      >
        Reply
      </button>
      {replyTo === comment.id && (
        <CommentFormOrAuth
          session={session}
          onLogin={onLogin}
          onSubmit={(body) => onSubmit(body, comment.id)}
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
              session={session}
              onLogin={onLogin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Renders the auth flow or the comment form depending on session state
function CommentFormOrAuth({
  session,
  onLogin,
  onSubmit,
  onCancel,
}: {
  session: Session | null;
  onLogin: (s: Session) => void;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
}) {
  if (session) {
    return <PostForm onSubmit={onSubmit} onCancel={onCancel} />;
  }
  return <AuthFlow onLogin={onLogin} onCancel={onCancel} />;
}

// Auth flow: email/name → code → verified
function AuthFlow({
  onLogin,
  onCancel,
}: {
  onLogin: (s: Session) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setError('');
    setLoading(true);
    const result = await requestCode(email.trim(), name.trim());
    setLoading(false);
    if (result.ok) {
      setStep('code');
    } else {
      setError(result.error || 'Failed to send code.');
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError('');
    setLoading(true);
    const result = await verifyCode(email.trim(), code.trim());
    setLoading(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      onLogin(result);
    }
  };

  if (step === 'code') {
    return (
      <form className="comment-form" onSubmit={handleVerifyCode}>
        <p className="comment-auth-hint">
          Code sent to <strong>{email}</strong>. Check your inbox.
        </p>
        {error && <p className="comments-error">{error}</p>}
        <input
          type="text"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={6}
          pattern="[0-9]{6}"
          autoComplete="one-time-code"
          inputMode="numeric"
        />
        <div className="comment-form-actions">
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError('');
            }}
          >
            Back
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="comment-form" onSubmit={handleRequestCode}>
      {error && <p className="comments-error">{error}</p>}
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
      />
      <input
        type="email"
        placeholder="Email (for verification, not displayed)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="comment-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending code...' : 'Verify email to comment'}
        </button>
      </div>
    </form>
  );
}

// Simple comment form for authenticated users
function PostForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (body: string) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hpRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    if (hpRef.current?.value) return;
    setSubmitting(true);
    await onSubmit(body.trim());
    setBody('');
    setSubmitting(false);
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
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
