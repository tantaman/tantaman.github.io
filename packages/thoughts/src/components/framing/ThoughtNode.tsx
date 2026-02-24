import { memo, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { renderMarkdown } from '../../markdown';
import { AuthContext } from '../../App';

export type ThoughtNodeData = {
  body: string;
  timestamp: number;
  thoughtId: number;
  onRemove?: (thoughtId: number) => void;
};

export type ThoughtNodeType = Node<ThoughtNodeData, 'thought'>;

export const ThoughtNode = memo(function ThoughtNode({
  data,
}: NodeProps<ThoughtNodeType>) {
  const { secret } = useContext(AuthContext);
  const html = renderMarkdown(data.body);

  return (
    <div className="framing-thought-node">
      {secret && data.onRemove && (
        <button
          className="framing-node-remove"
          onClick={() => data.onRemove!(data.thoughtId)}
          title="Remove from framing"
        >
          ×
        </button>
      )}
      <div
        className="thought-body thought-body--md framing-node-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
});
