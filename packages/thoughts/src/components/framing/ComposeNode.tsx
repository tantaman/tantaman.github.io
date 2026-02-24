import { memo, useState } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type ComposeNodeData = {
  onSubmit: (body: string) => void;
  onCancel: () => void;
};

export type ComposeNodeType = Node<ComposeNodeData, 'compose'>;

export const ComposeNode = memo(function ComposeNode({
  data,
}: NodeProps<ComposeNodeType>) {
  const [body, setBody] = useState('');

  const handleSubmit = () => {
    if (!body.trim()) return;
    data.onSubmit(body.trim());
  };

  return (
    <div className="framing-compose-node">
      <textarea
        className="framing-compose-textarea"
        placeholder="Write a new thought…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          if (e.key === 'Escape') data.onCancel();
        }}
        autoFocus
      />
      <div className="framing-compose-actions">
        <button className="framing-compose-cancel" onClick={data.onCancel}>
          Cancel
        </button>
        <button
          className="framing-compose-submit"
          onClick={handleSubmit}
          disabled={!body.trim()}
        >
          Create
        </button>
      </div>
    </div>
  );
});
