import { useContext } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { Thought, ThoughtVersion } from '../types';
import { AuthContext } from '../App';
import { useThread } from '../hooks/useCache';
import { ThoughtCard } from './ThoughtCard';
import { ThreadThought } from './ThreadThought';
import { ComposeForm } from './ComposeForm';
import { RelatedPanel } from './RelatedPanel';
import { AncestorChain } from './AncestorChain';

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
  const rootChildren = childrenMap.get(id) || [];
  const replyCount = data.replies.length;
  const versions: ThoughtVersion[] = data.versions || [];

  const handleParentDelete = () => {
    navigate({ to: '/' });
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

  const latestVersionId = versions.length > 0 ? versions[versions.length - 1].id : null;
  const isSuperseded = data.parent.superseded_by != null;

  return (
    <>
      <BackLink />

      {isSuperseded && latestVersionId != null && (
        <div className="version-banner">
          This thought has been revised.{' '}
          <Link to="/t/$id" params={{ id: latestVersionId }}>View latest version</Link>
        </div>
      )}

      {versions.length > 1 && (
        <div className="version-history">
          {versions.map((v, i) => (
            v.id === id ? (
              <span key={v.id} className="version-link version-link--current">v{i + 1}</span>
            ) : (
              <Link key={v.id} to="/t/$id" params={{ id: v.id }} className="version-link">v{i + 1}</Link>
            )
          ))}
        </div>
      )}

      {data.ancestors && data.ancestors.length > 0 && (
        <AncestorChain ancestors={data.ancestors} />
      )}

      <ThoughtCard
        thought={data.parent}
        isParent
        onDelete={handleParentDelete}
      />

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
