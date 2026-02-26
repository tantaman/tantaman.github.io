import type { Comment } from '../types';

interface Props {
  comment: Comment;
  currentUserId: number | null;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
}

function timeAgo(epoch: number): string {
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  const date = new Date(epoch * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CommentItem({ comment, currentUserId, onReply, onDelete }: Props) {
  if (comment.deleted) {
    return (
      <div class="comments-item comments-item-deleted">
        <span class="comments-deleted-text">[deleted]</span>
      </div>
    );
  }

  return (
    <div class="comments-item">
      <div class="comments-item-header">
        <span class="comments-item-name">{comment.commenter_name}</span>
        <span class="comments-item-time">{timeAgo(comment.created_at)}</span>
      </div>
      <p class="comments-item-body">{comment.body}</p>
      <div class="comments-item-actions">
        <button type="button" class="comments-action-btn" onClick={() => onReply(comment.id)}>
          Reply
        </button>
        {currentUserId === comment.commenter_id && (
          <button type="button" class="comments-action-btn comments-action-delete" onClick={() => onDelete(comment.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
