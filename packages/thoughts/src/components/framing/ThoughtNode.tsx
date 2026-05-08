import { memo, useContext, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { renderMarkdown } from '../../markdown';
import { AuthContext } from '../../App';

export type ThoughtNodeData = {
  body: string;
  timestamp: number;
  thoughtId: number;
  nodeId: number;
  color?: string | null;
  replyCount?: number;
  linkCount?: number;
  backlinkCount?: number;
  onRemove?: (nodeId: number) => void;
  onExpandReplies?: (nodeId: number) => void | Promise<void>;
  onExpandLinks?: (nodeId: number) => void | Promise<void>;
  onExpandBacklinks?: (nodeId: number) => void | Promise<void>;
};

export type ThoughtNodeType = Node<ThoughtNodeData, 'thought'>;

type PillKind = 'replies' | 'links' | 'backlinks';

export const ThoughtNode = memo(function ThoughtNode({
  data,
}: NodeProps<ThoughtNodeType>) {
  const { secret } = useContext(AuthContext);
  const [busy, setBusy] = useState<PillKind | null>(null);
  const [pucked, setPucked] = useState(false);
  const body = data.body.length > 500 ? data.body.slice(0, 500) + '…' : data.body;
  const html = renderMarkdown(body);
  const replyCount = data.replyCount ?? 0;
  const linkCount = data.linkCount ?? 0;
  const backlinkCount = data.backlinkCount ?? 0;

  const runExpand = async (
    kind: PillKind,
    fn: ((nodeId: number) => void | Promise<void>) | undefined,
  ) => {
    if (!fn || busy) return;
    setBusy(kind);
    try {
      await fn(data.nodeId);
    } finally {
      setBusy(null);
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const className = `framing-thought-node${pucked ? ' framing-thought-node--pucked' : ''}`;
  const style: React.CSSProperties | undefined = data.color
    ? pucked
      ? { backgroundColor: data.color, borderColor: data.color }
      : { backgroundColor: data.color + '14', borderLeft: `3px solid ${data.color}` }
    : undefined;

  return (
    <div className={className} style={style}>
      <button
        type="button"
        className="framing-node-puck-toggle"
        onClick={(e) => { e.stopPropagation(); setPucked((p) => !p); }}
        onMouseDown={stop}
        title={pucked ? 'Expand' : 'Collapse to puck'}
      >
        {pucked ? '⤢' : '◌'}
      </button>
      {secret && data.onRemove && !pucked && (
        <button
          type="button"
          className="framing-node-remove"
          onClick={(e) => {
            e.stopPropagation();
            data.onRemove!(data.nodeId);
          }}
          title="Remove from framing"
        >
          ×
        </button>
      )}
      <div
        className="thought-body thought-body--md framing-node-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!pucked && replyCount > 0 && (
        <button
          type="button"
          className="framing-node-expand framing-node-expand-replies"
          onClick={(e) => { e.stopPropagation(); runExpand('replies', data.onExpandReplies); }}
          onMouseDown={stop}
          disabled={busy !== null || !secret}
          title={secret ? `Expand ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Sign in to expand replies'}
        >
          {busy === 'replies' ? '…' : '↓'} {replyCount}
        </button>
      )}
      {!pucked && backlinkCount > 0 && (
        <button
          type="button"
          className="framing-node-expand framing-node-expand-backlinks"
          onClick={(e) => { e.stopPropagation(); runExpand('backlinks', data.onExpandBacklinks); }}
          onMouseDown={stop}
          disabled={busy !== null || !secret}
          title={secret ? `Expand ${backlinkCount} back-${backlinkCount === 1 ? 'link' : 'links'}` : 'Sign in to expand back-links'}
        >
          {busy === 'backlinks' ? '…' : '←'} {backlinkCount}
        </button>
      )}
      {!pucked && linkCount > 0 && (
        <button
          type="button"
          className="framing-node-expand framing-node-expand-links"
          onClick={(e) => { e.stopPropagation(); runExpand('links', data.onExpandLinks); }}
          onMouseDown={stop}
          disabled={busy !== null || !secret}
          title={secret ? `Expand ${linkCount} ${linkCount === 1 ? 'link' : 'links'}` : 'Sign in to expand links'}
        >
          {linkCount} {busy === 'links' ? '…' : '→'}
        </button>
      )}
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
});
