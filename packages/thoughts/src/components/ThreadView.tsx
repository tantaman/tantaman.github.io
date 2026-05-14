import { useContext } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { Thought, ThoughtVersion } from '../types';
import { AuthContext } from '../auth-context';
import { useThread } from '../hooks/useCache';
import { ThoughtCard } from './ThoughtCard';
import { ThreadThought } from './ThreadThought';
import { ComposeForm } from './ComposeForm';
import { RelatedPanel } from './RelatedPanel';
import { AncestorChain } from './AncestorChain';

// Group replies by their parent's version-root. The worker returns
// `parent_version_root` on each reply so children attached to an older version
// of a thought still group under the same key as children attached to the
// latest version. Falls back to raw `parent_id` for callers (e.g. older worker
// responses) that don't include the field.
function buildChildrenMap(replies: Thought[]): Map<number, Thought[]> {
  const map = new Map<number, Thought[]>();
  for (const r of replies) {
    const key = r.parent_version_root ?? r.parent_id;
    if (key == null) continue;
    const list = map.get(key) || [];
    list.push(r);
    map.set(key, list);
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
  const parentRoot = data.parent.version_of ?? data.parent.id;
  const rootChildren = childrenMap.get(parentRoot) || [];
  const replyCount = data.replies.length;
  const versions: ThoughtVersion[] = data.versions || [];

  const handleParentDelete = () => {
    navigate({ to: '/' });
  };

  const handleParentEdited = (t: Thought) => {
    navigate({ to: '/t/$id', params: { id: t.id } });
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
    // Drop the version we just superseded and append the new one.
    // A fresh refetch will return the same shape (worker filters
    // superseded_by IS NULL), so this just keeps the UI consistent until then.
    const supersededId = t.version_of;
    mutate(
      {
        ...data,
        replies: [
          ...data.replies.filter(
            (r) => r.id !== supersededId && r.version_of !== supersededId,
          ),
          t,
        ],
      },
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
        onEdited={secret ? handleParentEdited : undefined}
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
