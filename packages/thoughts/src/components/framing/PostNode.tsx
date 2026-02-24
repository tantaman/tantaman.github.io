import { memo, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { AuthContext } from '../../App';

export type PostNodeData = {
  nodeId: number;
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  onRemove?: (nodeId: number) => void;
};

export type PostNodeType = Node<PostNodeData, 'post'>;

export const PostNode = memo(function PostNode({
  data,
}: NodeProps<PostNodeType>) {
  const { secret } = useContext(AuthContext);
  const summary = data.summary.length > 200 ? data.summary.slice(0, 200) + '…' : data.summary;

  return (
    <div className="framing-post-node">
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
      {summary && <div className="framing-post-node-summary">{summary}</div>}
      {data.tags.length > 0 && (
        <div className="framing-post-node-tags">
          {data.tags.map((tag) => (
            <span key={tag} className="framing-post-node-tag">{tag}</span>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
});
