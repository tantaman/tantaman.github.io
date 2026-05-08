import { memo, useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { AuthContext } from '../../App';

export type DocumentNodeData = {
  nodeId: number;
  documentId: number;
  title: string;
  body: string;
  updatedAt: number;
  private: boolean;
  onRemove?: (nodeId: number) => void;
};

export type DocumentNodeType = Node<DocumentNodeData, 'document'>;

function previewBody(body: string, max = 200): string {
  const trimmed = body.replace(/^#\s+.*$/m, '').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max) + '…';
}

export const DocumentNode = memo(function DocumentNode({
  data,
}: NodeProps<DocumentNodeType>) {
  const { secret } = useContext(AuthContext);
  const preview = previewBody(data.body || '');

  return (
    <div className="framing-document-node">
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
        href={`#document-${data.documentId}`}
        className="framing-document-node-title"
      >
        {data.title || 'Untitled'}
        {data.private && <span className="framing-document-node-private" title="Private">·</span>}
      </a>
      {preview && <div className="framing-document-node-summary">{preview}</div>}
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
