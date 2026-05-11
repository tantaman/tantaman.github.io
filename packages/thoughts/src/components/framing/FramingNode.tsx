import { memo, useCallback, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { AuthContext } from '../../App';

export type FramingNodeData = {
  nodeId: number;
  framingId: number;
  title: string | null;
  onRemove?: (nodeId: number) => void;
};

export type FramingNodeType = Node<FramingNodeData, 'framing'>;

export const FramingNode = memo(function FramingNode({
  data,
}: NodeProps<FramingNodeType>) {
  const { secret } = useContext(AuthContext);

  const open = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.hash = `#framing-${data.framingId}`;
    },
    [data.framingId],
  );

  return (
    <div
      className="framing-framing-node"
      onDoubleClick={open}
      title="Double-click to enter"
    >
      {secret && data.onRemove && (
        <button
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
      <div className="framing-framing-node-icon" aria-hidden="true">⌘</div>
      <a
        href={`#framing-${data.framingId}`}
        className="framing-framing-node-title"
        onClick={open}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      >
        {data.title || 'Untitled framing'}
      </a>
      <button
        className="framing-framing-node-enter"
        onClick={open}
        title="Enter framing"
      >
        ↗
      </button>
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
