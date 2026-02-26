import { useState, useEffect, useCallback } from 'preact/hooks';
import type { Comment, Commenter } from '../types';
import { fetchComments, createComment, deleteComment, checkSession } from '../api';
import { getVisitorId, getCommenter, getSessionToken, clearSession } from '../auth';
import { CommentThread } from './CommentThread';
import { CommentForm } from './CommentForm';
import { AuthModal } from './AuthModal';

interface Props {
  slug: string;
}

export function CommentsSection({ slug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commenter, setCommenter] = useState<Commenter | null>(getCommenter());
  const [showAuth, setShowAuth] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const visitorId = getVisitorId();
      const data = await fetchComments(slug, visitorId);
      setComments(data.comments);
    } catch {
      // Ignore
    } finally {
      setLoaded(true);
    }
  }, [slug]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Validate session on mount
  useEffect(() => {
    if (!getSessionToken()) return;
    checkSession()
      .then((data) => setCommenter(data.commenter))
      .catch(() => {
        clearSession();
        setCommenter(null);
      });
  }, []);

  const handleAuthenticated = (c: Commenter) => {
    setCommenter(c);
    setShowAuth(false);
  };

  const handleSubmitComment = async (body: string) => {
    if (!commenter) {
      setShowAuth(true);
      return;
    }
    await createComment(slug, body);
    await loadComments();
  };

  const handleSubmitReply = async (body: string, parentId: number) => {
    if (!commenter) {
      setShowAuth(true);
      return;
    }
    await createComment(slug, body, parentId);
    setReplyingTo(null);
    await loadComments();
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    await deleteComment(slug, commentId);
    await loadComments();
  };

  const handleReply = (commentId: number) => {
    if (!commenter) {
      setShowAuth(true);
      return;
    }
    setReplyingTo(commentId);
  };

  const handleLogout = () => {
    clearSession();
    setCommenter(null);
  };

  const activeComments = comments.filter((c) => !c.deleted || comments.some((r) => r.parent_id === c.id));

  return (
    <div class="comments-section-container">
      <div class="comments-section-header">
        <h2>Comments</h2>
        {commenter ? (
          <div class="comments-user-info">
            <span>{commenter.display_name}</span>
            <button type="button" class="comments-action-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <button type="button" class="comments-btn-secondary" onClick={() => setShowAuth(true)}>
            Sign in
          </button>
        )}
      </div>

      {commenter ? (
        <CommentForm onSubmit={handleSubmitComment} />
      ) : (
        <button
          type="button"
          class="comments-signin-prompt"
          onClick={() => setShowAuth(true)}
        >
          Sign in to leave a comment
        </button>
      )}

      {loaded && activeComments.length > 0 && (
        <CommentThread
          comments={activeComments}
          parentId={null}
          depth={0}
          currentUserId={commenter?.id ?? null}
          replyingTo={replyingTo}
          onReply={handleReply}
          onCancelReply={() => setReplyingTo(null)}
          onSubmitReply={handleSubmitReply}
          onDelete={handleDelete}
        />
      )}

      {loaded && activeComments.length === 0 && (
        <p class="comments-empty">No comments yet. Be the first to share your thoughts.</p>
      )}

      {showAuth && (
        <AuthModal
          onAuthenticated={handleAuthenticated}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
