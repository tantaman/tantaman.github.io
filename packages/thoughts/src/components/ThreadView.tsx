import { useContext } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { Thought } from '../types';
import { AuthContext } from '../auth-context';
import { useThread } from '../hooks/useCache';
import { ThoughtCard } from './ThoughtCard';
import { ThreadThought } from './ThreadThought';
import { ComposeForm } from './ComposeForm';
import { RelatedPanel } from './RelatedPanel';
import { AncestorChain } from './AncestorChain';
import { VersionHistory } from './VersionHistory';

// Group replies by their (stable) parent id.
function buildChildrenMap(replies: Thought[]): Map<number, Thought[]> {
  const map = new Map<number, Thought[]>();
  for (const r of replies) {
    if (r.parent_id == null) continue;
    const list = map.get(r.parent_id) || [];
    list.push(r);
    map.set(r.parent_id, list);
  }
  return map;
}

function BackLink() {
  return (
    <div className="thread-back">
      <Link to="/" className="thread-back-link">
        &larr; Back
      </Link>
    </div>
  );
}

export function ThreadView({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  const { data, error, mutate } = useThread(id, secret);
  const navigate = useNavigate();

  if (error) {
    return (
      <>
        <BackLink />
        <div className="thought-loading">
          Thought not found.{' '}
          <Link to="/" className="thread-back-link">
            Back to feed
          </Link>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <BackLink />
        <div className="thought-loading">Loading...</div>
      </>
    );
  }

  const childrenMap = buildChildrenMap(data.replies);
  const rootChildren = childrenMap.get(data.parent.id) || [];
  const replyCount = data.replies.length;

  const handleParentDelete = () => {
    navigate({ to: '/' });
  };

  // Edits keep the same id, so update the parent in place rather than navigating.
  const handleParentEdited = (t: Thought) => {
    mutate({ ...data, parent: { ...data.parent, ...t } }, false);
  };

  const handleReplyPosted = (t: Thought) => {
    mutate({ ...data, replies: [...data.replies, t] }, false);
  };

  const handleReplyDelete = (deletedId: number) => {
    mutate(
      { ...data, replies: data.replies.filter((r) => r.id !== deletedId) },
      false,
    );
  };

  const handleReplyEdited = (t: Thought) => {
    // Edit is in place (same id) — swap the updated reply, preserving fields the
    // edit response omits (e.g. reply_count) via spread order.
    mutate(
      {
        ...data,
        replies: data.replies.map((r) => (r.id === t.id ? { ...r, ...t } : r)),
      },
      false,
    );
  };

  return (
    <>
      <BackLink />

      {data.ancestors && data.ancestors.length > 0 && (
        <AncestorChain ancestors={data.ancestors} />
      )}

      <ThoughtCard
        thought={data.parent}
        isParent
        onDelete={handleParentDelete}
        onEdited={secret ? handleParentEdited : undefined}
      />

      <VersionHistory thought={data.parent} onReverted={handleParentEdited} />

      <RelatedPanel thoughtId={id} />

      <div className="replies-label">
        {replyCount > 0
          ? `${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}`
          : 'No replies yet'}
      </div>

      {rootChildren.map((child) => (
        <ThreadThought
          key={child.id}
          thought={child}
          childrenMap={childrenMap}
          depth={0}
          onReplyPosted={handleReplyPosted}
          onDelete={handleReplyDelete}
          onEdited={handleReplyEdited}
        />
      ))}

      {secret && (
        <div className="reply-form-wrap">
          <ComposeForm
            parentId={id}
            placeholder="Write a reply..."
            submitLabel="Reply"
            defaultPrivate={data.parent.private}
            onPosted={handleReplyPosted}
          />
        </div>
      )}
    </>
  );
}
