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
  kind?: string | null;
  onLabelChange?: (edgeDbId: number, label: string) => void;
};

export type LabeledEdgeType = Edge<LabeledEdgeData, 'labeled'>;

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps<LabeledEdgeType>) {
  const { secret } = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data?.label ?? '');

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const commitLabel = useCallback(() => {
    setEditing(false);
    if (data?.onLabelChange && value !== (data.label ?? '')) {
      data.onLabelChange(data.edgeDbId, value);
    }
  }, [data, value]);

  const kind = data?.kind ?? null;
  const isAuto = kind === 'reply' || kind === 'link';
  const hasLabel = !!data?.label;
  // Hide the empty label pill on auto-generated edges; only show when there is
  // text to display, the edge is selected, or the user is editing.
  const showLabelBox = editing || selected || hasLabel || !isAuto;
  const kindClass = kind ? ` kind-${kind}` : '';

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={`framing-edge-label${selected ? ' selected' : ''}${kindClass}${showLabelBox ? '' : ' hidden'}`}
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
