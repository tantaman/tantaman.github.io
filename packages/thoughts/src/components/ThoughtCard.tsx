import { useContext, type ReactNode } from 'react';
import type { Thought } from '../types';
import { attachmentUrl } from '../api';
import * as api from '../api';
import { AuthContext } from '../App';

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

function formatBody(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(before);
    parts.push(match[1]);
    const tag = match[2];
    parts.push(
      <a
        key={match.index}
        className="thought-tag"
        href={`#tag-${encodeURIComponent(tag.toLowerCase())}`}
      >
        #{tag}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  const rest = text.slice(lastIndex);
  if (rest) parts.push(rest);
  return parts;
}

export function ThoughtCard({
  thought,
  isParent,
  inThread,
  footer,
  onDelete,
}: {
  thought: Thought;
  isParent?: boolean;
  inThread?: boolean;
  footer?: ReactNode;
  onDelete?: () => void;
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

  return (
    <div
      className={'thought' + (isParent ? ' thought--parent' : '')}
      data-id={thought.id}
    >
      <div className="thought-header">
        <span className="thought-author">tantaman</span>
        <span className="thought-meta-sep">&middot;</span>
        <span className="thought-time">{formatTime(thought.timestamp)}</span>
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
      <div className="thought-body">{formatBody(thought.body)}</div>
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
