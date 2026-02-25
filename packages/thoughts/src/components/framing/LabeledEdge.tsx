import { useCallback, useContext, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { AuthContext } from '../../App';

export type LabeledEdgeData = {
  label: string | null;
  edgeDbId: number;
  onLabelChange?: (edgeDbId: number, label: string) => void;
};

export type LabeledEdgeType = Edge<LabeledEdgeData, 'labeled'>;

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps<LabeledEdgeType>) {
  const { secret } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data?.label ?? '');

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const commitLabel = useCallback(() => {
    setEditing(false);
    if (data?.onLabelChange && value !== (data.label ?? '')) {
      data.onLabelChange(data.edgeDbId, value);
    }
  }, [data, value]);

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className={`framing-edge-label${selected ? ' selected' : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onDoubleClick={(e) => {
            if (!secret) return;
            e.stopPropagation();
            setValue(data?.label ?? '');
            setEditing(true);
          }}
        >
          {editing ? (
            <input
              className="framing-edge-label-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabel();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
            />
          ) : (
            <span className="framing-edge-label-text">
              {data?.label ?? ''}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
