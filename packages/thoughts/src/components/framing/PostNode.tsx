import { memo, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { AuthContext } from '../../auth-context';

export type PostNodeData = {
  nodeId: number;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  color: string | null;
  onRemove?: (nodeId: number) => void;
};

export type PostNodeType = Node<PostNodeData, 'post'>;

export const PostNode = memo(function PostNode({
  data,
}: NodeProps<PostNodeType>) {
  const { secret } = useContext(AuthContext);
  const description = data.description.length > 200 ? data.description.slice(0, 200) + '…' : data.description;

  return (
    <div className="framing-post-node" style={data.color ? { borderLeftColor: data.color } : undefined}>
      {secret && data.onRemove && (
        <button
          className="framing-node-remove"
          onClick={() => data.onRemove!(data.nodeId)}
          title="Remove from framing"
        >
          ×
        </button>
      )}
      <a
        href={`/${data.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="framing-post-node-title"
      >
        {data.title}
      </a>
      {data.date && <div className="framing-post-node-date">{data.date}</div>}
      {description && <div className="framing-post-node-summary">{description}</div>}
      {data.tags.length > 0 && (
        <div className="framing-post-node-tags">
          {data.tags.map((tag) => (
            <span key={tag} className="framing-post-node-tag">{tag}</span>
          ))}
        </div>
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
