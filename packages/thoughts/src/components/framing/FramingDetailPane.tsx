import { useContext, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import type { Thought } from '../../types';
import { AuthContext } from '../../auth-context';
import { useThread } from '../../hooks/useCache';
import { ThoughtCard } from '../ThoughtCard';
import { ThreadThought } from '../ThreadThought';
import { ComposeForm } from '../ComposeForm';
import { RelatedPanel } from '../RelatedPanel';
import { AncestorChain } from '../AncestorChain';
import { VersionHistory } from '../VersionHistory';

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

export function FramingDetailPane({
  thoughtId,
  onClose,
}: {
  thoughtId: number;
  onClose: () => void;
}) {
  const { secret } = useContext(AuthContext);
  const { data, error, mutate } = useThread(thoughtId, secret);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="framing-detail-pane" aria-label="Thought detail">
      <div className="framing-detail-header">
        <Link
          to="/t/$id"
          params={{ id: thoughtId }}
          className="framing-detail-open"
          title="Open in full thread view"
        >
          Open ↗
        </Link>
        <button
          type="button"
          className="framing-detail-close"
          onClick={onClose}
          aria-label="Close detail pane"
          title="Close (Esc)"
        >
          ×
        </button>
      </div>
      <div className="framing-detail-body">
        {error ? (
          <div className="thought-loading">Thought not found.</div>
        ) : !data ? (
          <div className="thought-loading">Loading…</div>
        ) : (
          <DetailContent
            data={data}
            thoughtId={thoughtId}
            secret={secret}
            mutate={mutate}
            onParentDeleted={onClose}
          />
        )}
      </div>
    </aside>
  );
}

type ThreadData = NonNullable<ReturnType<typeof useThread>['data']>;

function DetailContent({
  data,
  thoughtId,
  secret,
  mutate,
  onParentDeleted,
}: {
  data: ThreadData;
  thoughtId: number;
  secret: string | null;
  mutate: ReturnType<typeof useThread>['mutate'];
  onParentDeleted: () => void;
}) {
  const childrenMap = buildChildrenMap(data.replies);
  const rootChildren = childrenMap.get(thoughtId) || [];
  const replyCount = data.replies.length;

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
    mutate(
      { ...data, replies: data.replies.map((r) => (r.id === t.id ? { ...r, ...t } : r)) },
      false,
    );
  };

  return (
    <>
      {data.ancestors && data.ancestors.length > 0 && (
        <AncestorChain ancestors={data.ancestors} />
      )}

      <ThoughtCard
        thought={data.parent}
        isParent
        onDelete={onParentDeleted}
        onEdited={secret ? handleParentEdited : undefined}
      />

      <VersionHistory thought={data.parent} onReverted={handleParentEdited} />

      <RelatedPanel thoughtId={thoughtId} />

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
          onEdited={secret ? handleReplyEdited : undefined}
        />
      ))}

      {secret && (
        <div className="reply-form-wrap">
          <ComposeForm
            parentId={thoughtId}
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
