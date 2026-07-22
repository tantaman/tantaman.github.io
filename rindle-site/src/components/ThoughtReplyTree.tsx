import { useState } from "react";

import { ThoughtCard, type ThoughtCardData } from "./ThoughtCard.tsx";
import { ThoughtComposer } from "./ThoughtComposer.tsx";

export interface ThoughtThreadNode {
  thought: ThoughtCardData;
  children: ThoughtThreadNode[];
}

/** Join a bounded root window and a bounded flat reply window into arbitrary-depth trees. Rows whose
 * parent is not visible stay hidden instead of leaking a public descendant through a private or
 * unloaded ancestor. */
export function buildThoughtForest(
  roots: readonly ThoughtCardData[],
  replies: readonly ThoughtCardData[],
): ThoughtThreadNode[] {
  const nodes = new Map<string, ThoughtThreadNode>();
  for (const thought of [...roots, ...replies]) {
    const existing = nodes.get(thought.id);
    if (existing) existing.thought = thought;
    else nodes.set(thought.id, { thought, children: [] });
  }

  const attached = new Set<string>();
  for (const reply of replies) {
    if (attached.has(reply.id)) continue;
    attached.add(reply.id);
    const node = nodes.get(reply.id)!;
    const parent = reply.parentId ? nodes.get(reply.parentId) : undefined;
    if (parent && parent !== node) parent.children.push(node);
  }

  return roots.map((root) => nodes.get(root.id)!);
}

interface ThoughtTreeNodeViewProps {
  node: ThoughtThreadNode;
  depth: number;
  variant: "feed" | "reply";
  isAdmin: boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  onSubmitted: () => void;
}

function ThoughtTreeNodeView({
  node,
  depth,
  variant,
  isAdmin,
  replyingTo,
  setReplyingTo,
  onSubmitted,
}: ThoughtTreeNodeViewProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { thought, children } = node;

  return (
    <>
      <ThoughtCard
        thought={thought}
        isAdmin={isAdmin}
        variant={variant}
        inlineThread
        visibleReplyCount={children.length}
        repliesCollapsed={collapsed}
        onReply={isAdmin ? () => setReplyingTo(replyingTo === thought.id ? null : thought.id) : undefined}
        onToggleReplies={children.length > 0 ? () => setCollapsed((value) => !value) : undefined}
      />

      {replyingTo === thought.id && isAdmin ? (
        <div className="thought-inline-reply-composer">
          <ThoughtComposer
            parentId={thought.id}
            parentTaskIds={(thought.tasks ?? []).map((task) => task.id)}
            defaultPrivate={thought.private === 1}
            placeholder="Continue this thread…"
            submitLabel="Add reply"
            compact
            autoFocus
            onCancel={() => setReplyingTo(null)}
            onDone={() => {
              setReplyingTo(null);
              onSubmitted();
            }}
          />
        </div>
      ) : null}

      {!collapsed && children.length > 0 ? (
        <ul
          className="thought-inline-replies"
          style={depth >= 7 ? { marginLeft: 0, paddingLeft: 0 } : undefined}
        >
          {children.map((child) => (
            <li key={child.thought.id}>
              <ThoughtTreeNodeView
                node={child}
                depth={depth + 1}
                variant="reply"
                isAdmin={isAdmin}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                onSubmitted={onSubmitted}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function ThoughtFeedThread({
  node,
  isAdmin,
  onSubmitted,
}: {
  node: ThoughtThreadNode;
  isAdmin: boolean;
  onSubmitted: () => void;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  return (
    <section className="thought-feed-thread" aria-label={`Thought ${node.thought.id} and replies`}>
      <ThoughtTreeNodeView
        node={node}
        depth={0}
        variant="feed"
        isAdmin={isAdmin}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        onSubmitted={onSubmitted}
      />
    </section>
  );
}

export function ThoughtReplyBranches({
  nodes,
  isAdmin,
  onSubmitted,
}: {
  nodes: readonly ThoughtThreadNode[];
  isAdmin: boolean;
  onSubmitted: () => void;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  if (nodes.length === 0) return null;
  return (
    <ul className="thought-inline-replies thought-inline-replies--detail">
      {nodes.map((node) => (
        <li key={node.thought.id}>
          <ThoughtTreeNodeView
            node={node}
            depth={1}
            variant="reply"
            isAdmin={isAdmin}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            onSubmitted={onSubmitted}
          />
        </li>
      ))}
    </ul>
  );
}
