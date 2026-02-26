import type { Comment } from '../types';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';

const MAX_INDENT = 4;

interface Props {
  comments: Comment[];
  parentId: number | null;
  depth: number;
  currentUserId: number | null;
  replyingTo: number | null;
  onReply: (commentId: number) => void;
  onCancelReply: () => void;
  onSubmitReply: (body: string, parentId: number) => Promise<void>;
  onDelete: (commentId: number) => void;
}

export function CommentThread({
  comments,
  parentId,
  depth,
  currentUserId,
  replyingTo,
  onReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
}: Props) {
  const children = comments.filter((c) => c.parent_id === parentId);
  if (children.length === 0) return null;

  const indentClass = depth < MAX_INDENT ? 'comments-thread-indent' : '';

  return (
    <div class={`comments-thread ${indentClass}`}>
      {children.map((comment) => (
        <div key={comment.id}>
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            onReply={onReply}
            onDelete={onDelete}
          />
          {replyingTo === comment.id && (
            <div class="comments-reply-form">
              <CommentForm
                onSubmit={(body) => onSubmitReply(body, comment.id)}
                placeholder={`Reply to ${comment.commenter_name}...`}
                autoFocus
                onCancel={onCancelReply}
              />
            </div>
          )}
          <CommentThread
            comments={comments}
            parentId={comment.id}
            depth={depth + 1}
            currentUserId={currentUserId}
            replyingTo={replyingTo}
            onReply={onReply}
            onCancelReply={onCancelReply}
            onSubmitReply={onSubmitReply}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
