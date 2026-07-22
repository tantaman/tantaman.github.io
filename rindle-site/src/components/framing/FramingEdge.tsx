import { useCallback, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export interface FramingEdgeData extends Record<string, unknown> {
  label: string | null;
  edgeId: string;
  kind: string | null;
  editable: boolean;
  onLabelChange?: (edgeId: string, label: string | null) => void;
}

export type FramingFlowEdge = Edge<FramingEdgeData, "labeled">;

export function FramingLabeledEdge({
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
}: EdgeProps<FramingFlowEdge>) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data?.label ?? "");
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const commit = useCallback(() => {
    setEditing(false);
    const next = value.trim() || null;
    if (data?.onLabelChange && next !== data.label) data.onLabelChange(data.edgeId, next);
  }, [data, value]);

  const kind = data?.kind ?? null;
  const autoEdge = kind === "reply" || kind === "link";
  const showLabel = editing || selected || Boolean(data?.label) || !autoEdge;
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={`framing-edge-label${selected ? " selected" : ""}${kind ? ` kind-${kind}` : ""}${showLabel ? "" : " hidden"}`}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onDoubleClick={(event) => {
            if (!data?.editable) return;
            event.stopPropagation();
            setValue(data.label ?? "");
            setEditing(true);
          }}
        >
          {editing ? (
            <input
              className="framing-edge-label-input nodrag"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
                if (event.key === "Escape") setEditing(false);
              }}
              autoFocus
            />
          ) : <span className="framing-edge-label-text">{data?.label ?? ""}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
