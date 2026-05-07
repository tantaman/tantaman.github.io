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
  onRemove?: (nodeId: number) => void;
  onExpandReplies?: (nodeId: number) => void | Promise<void>;
};

export type ThoughtNodeType = Node<ThoughtNodeData, 'thought'>;

export const ThoughtNode = memo(function ThoughtNode({
  data,
}: NodeProps<ThoughtNodeType>) {
  const { secret } = useContext(AuthContext);
  const [expanding, setExpanding] = useState(false);
  const body = data.body.length > 500 ? data.body.slice(0, 500) + '…' : data.body;
  const html = renderMarkdown(body);
  const replyCount = data.replyCount ?? 0;

  const handleExpand = async () => {
    if (!data.onExpandReplies || expanding) return;
    setExpanding(true);
    try {
      await data.onExpandReplies(data.nodeId);
    } finally {
      setExpanding(false);
    }
  };

  return (
    <div className="framing-thought-node" style={data.color ? { backgroundColor: data.color + '14' } : undefined}>
      {secret && data.onRemove && (
        <button
          className="framing-node-remove"
          onClick={() => data.onRemove!(data.nodeId)}
          title="Remove from framing"
        >
          ×
        </button>
      )}
      <div
        className="thought-body thought-body--md framing-node-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {replyCount > 0 && (
        <button
          className="framing-node-expand-replies"
          onClick={handleExpand}
          disabled={expanding || !secret}
          title={secret ? `Expand ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : 'Sign in to expand replies'}
        >
          {expanding ? '…' : '↓'} {replyCount}
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
