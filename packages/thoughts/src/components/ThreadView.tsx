import { useContext, useEffect, useState } from 'react';
import type { Thought } from '../types';
import { getThread } from '../api';
import { AuthContext } from '../App';
import { ThoughtCard } from './ThoughtCard';
import { ThreadThought } from './ThreadThought';
import { ComposeForm } from './ComposeForm';

interface ThreadData {
  parent: Thought;
  replies: Thought[];
}

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

function navigateToFeed() {
  history.pushState(null, '', location.pathname);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function ThreadView({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  const [data, setData] = useState<ThreadData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setError(false);
    getThread(id)
      .then(setData)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <>
        <div className="thread-back">
          <a
            href="#"
            className="thread-back-link"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeed();
            }}
          >
            &larr; Back
          </a>
        </div>
        <div className="thought-loading">
          Thought not found.{' '}
          <a
            href="#"
            className="thread-back-link"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeed();
            }}
          >
            Back to feed
          </a>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="thread-back">
          <a
            href="#"
            className="thread-back-link"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeed();
            }}
          >
            &larr; Back
          </a>
        </div>
        <div className="thought-loading">Loading...</div>
      </>
    );
  }

  const childrenMap = buildChildrenMap(data.replies);
  const rootChildren = childrenMap.get(id) || [];
  const replyCount = data.replies.length;

  const handleParentDelete = () => {
    navigateToFeed();
  };

  const handleReplyPosted = (t: Thought) => {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, replies: [...prev.replies, t] };
    });
  };

  const handleReplyDelete = (deletedId: number) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        replies: prev.replies.filter((r) => r.id !== deletedId),
      };
    });
  };

  return (
    <>
      <div className="thread-back">
        <a
          href="#"
          className="thread-back-link"
          onClick={(e) => {
            e.preventDefault();
            navigateToFeed();
          }}
        >
          &larr; Back
        </a>
      </div>

      <ThoughtCard
        thought={data.parent}
        isParent
        onDelete={handleParentDelete}
      />

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
            onPosted={handleReplyPosted}
          />
        </div>
      )}
    </>
  );
}
