import { useContext, useMemo, type ReactNode } from 'react';
import type { Thought } from '../types';
import { attachmentUrl } from '../api';
import * as api from '../api';
import { AuthContext } from '../App';
import { renderMarkdown } from '../markdown';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function ThoughtCard({
  thought,
  isParent,
  inThread,
  footer,
  onDelete,
  maxBodyChars,
  readMore,
}: {
  thought: Thought;
  isParent?: boolean;
  inThread?: boolean;
  footer?: ReactNode;
  onDelete?: () => void;
  maxBodyChars?: number;
  readMore?: ReactNode;
}) {
  const { secret, updateSecret } = useContext(AuthContext);

  const handleDelete = async () => {
    if (!secret || !confirm('Delete this thought?')) return;
    try {
      await api.deleteThought(thought.id, secret);
      onDelete?.();
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        updateSecret(null);
      }
    }
  };

  const isTruncated = maxBodyChars != null && thought.body.length > maxBodyChars;
  const displayBody = isTruncated ? thought.body.slice(0, maxBodyChars) + '\u2026' : thought.body;

  return (
    <div
      className={'thought' + (isParent ? ' thought--parent' : '')}
      data-id={thought.id}
      style={thought.color ? { backgroundColor: thought.color + '14' } : undefined}
    >
      <div className="thought-header">
        <a href={`#thought-${thought.id}`} className="thought-header-link">
          <span className="thought-number">#{thought.id}</span>
          <span className="thought-meta-sep">&middot;</span>
          <span className="thought-author">tantaman</span>
          <span className="thought-meta-sep">&middot;</span>
          <span className="thought-time">{formatTime(thought.timestamp)}</span>
          {!!thought.private && (
            <>
              <span className="thought-meta-sep">&middot;</span>
              <span className="thought-private-dot" title="Private">&#9679;</span>
            </>
          )}
        </a>
        {secret && (
          <button
            className="thought-delete"
            aria-label="Delete thought"
            onClick={handleDelete}
          >
            &times;
          </button>
        )}
      </div>
      <div
        className="thought-body thought-body--md"
        dangerouslySetInnerHTML={useMemo(
          () => ({ __html: renderMarkdown(displayBody) }),
          [displayBody],
        )}
      />
      {isTruncated && readMore}
      {thought.attachments && thought.attachments.length > 0 && (
        <div className="thought-attachments">
          {thought.attachments.map((att) => {
            const url = attachmentUrl(att.key);
            return att.type?.startsWith('image/') ? (
              <img key={att.key} src={url} alt={att.name} loading="lazy" />
            ) : (
              <a
                key={att.key}
                className="thought-file-link"
                href={url}
                download={att.name}
              >
                {att.name}
              </a>
            );
          })}
        </div>
      )}
      {footer}
    </div>
  );
}
