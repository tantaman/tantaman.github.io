import { useContext, useState } from 'react';
import type { Thought } from '../types';
import { AuthContext } from '../auth-context';
import { ThoughtCard } from './ThoughtCard';
import { ComposeForm } from './ComposeForm';

export function ThreadThought({
  thought,
  childrenMap,
  depth,
  onReplyPosted,
  onDelete,
}: {
  thought: Thought;
  childrenMap: Map<number, Thought[]>;
  depth: number;
  onReplyPosted: (t: Thought) => void;
  onDelete: (id: number) => void;
}) {
  const { secret } = useContext(AuthContext);
  const [showReply, setShowReply] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const children = childrenMap.get(thought.id) || [];
  const nextDepth = Math.min(depth + 1, 4);

  const footer = secret ? (
    <div className="thought-footer">
      <a
        href="javascript:void(0)"
        className="thought-reply-btn"
        onClick={(e) => {
          e.preventDefault();
          setShowReply((v) => !v);
        }}
      >
        Reply
      </a>
    </div>
  ) : null;

  return (
    <div>
      <ThoughtCard
        thought={thought}
        inThread
        maxBodyChars={expanded ? undefined : 1000}
        readMore={
          <button className="thought-read-more thought-read-more--btn" onClick={() => setExpanded(true)}>
            show more
          </button>
        }
        onDelete={() => onDelete(thought.id)}
        footer={footer}
      />

      {showReply && (
        <div className="reply-form-wrap">
          <ComposeForm
            parentId={thought.id}
            placeholder="Write a reply..."
            submitLabel="Reply"
            defaultPrivate={thought.private}
            onPosted={(t) => {
              onReplyPosted(t);
              setShowReply(false);
            }}
          />
        </div>
      )}

      {children.length > 0 && (
        <div className="thought-children" data-depth={nextDepth}>
          {children.map((child) => (
            <ThreadThought
              key={child.id}
              thought={child}
              childrenMap={childrenMap}
              depth={nextDepth}
              onReplyPosted={onReplyPosted}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
