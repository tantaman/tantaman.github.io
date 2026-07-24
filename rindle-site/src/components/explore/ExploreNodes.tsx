import { memo, type CSSProperties, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { ExploreItem } from "./types.ts";

export interface ExploreNodeData extends Record<string, unknown> {
  nodeId: string;
  item: ExploreItem;
  pinned: boolean;
  focused: boolean;
  discoveredBy: string;
  onFocus: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onExpandMixed: (id: string) => void;
  onCollapse: (id: string) => void;
}

export type ExploreFlowNode = Node<ExploreNodeData, "exploreItem">;

function itemHref(item: ExploreItem): string {
  if (item.kind === "thought") return `/thoughts/${encodeURIComponent(item.id)}`;
  if (item.kind === "paste") return `/paste/${encodeURIComponent(item.id)}`;
  return `/${encodeURIComponent(item.id)}`;
}

export const ExploreItemNode = memo(function ExploreItemNode({ data }: NodeProps<ExploreFlowNode>) {
  const stop = (event: MouseEvent) => event.stopPropagation();
  const style = data.item.color && /^#[0-9a-f]{6}$/iu.test(data.item.color)
    ? ({ "--explore-node-color": data.item.color } as CSSProperties)
    : undefined;
  return (
    <article
      className={`explore-node kind-${data.item.kind}${data.pinned ? " is-pinned" : " is-suggested"}${data.focused ? " is-focused" : ""}`}
      style={style}
      onDoubleClick={() => data.onFocus(data.nodeId)}
    >
      <header>
        <span className="explore-node-kind">{data.item.kind}</span>
        <button
          type="button"
          className={`explore-node-pin nodrag${data.pinned ? " is-pinned" : ""}`}
          onClick={(event) => { event.stopPropagation(); data.onTogglePinned(data.nodeId); }}
          onMouseDown={stop}
          title={data.pinned ? "Unpin from this trail" : "Pin in this trail"}
          aria-label={data.pinned ? "Unpin node" : "Pin node"}
        >{data.pinned ? "◆" : "◇"}</button>
      </header>
      <a className="explore-node-title nodrag" href={itemHref(data.item)} target="_blank" rel="noreferrer" onMouseDown={stop}>
        {data.item.title}
      </a>
      {data.item.preview ? <p>{data.item.preview}</p> : null}
      <footer>
        <span>{data.item.date || data.item.meta || data.discoveredBy}</span>
        <div>
          <button
            type="button"
            className="nodrag"
            onClick={(event) => { event.stopPropagation(); data.onCollapse(data.nodeId); }}
            onMouseDown={stop}
            title="Collapse unpinned discoveries from this node"
          >−</button>
          <button
            type="button"
            className="nodrag explore-node-fan"
            onClick={(event) => { event.stopPropagation(); data.onExpandMixed(data.nodeId); }}
            onMouseDown={stop}
            title="Fan out with a mixed set of connections"
          >＋</button>
        </div>
      </footer>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </article>
  );
});
