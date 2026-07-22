import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";

import {
  formatThoughtTime,
  renderThoughtMarkdown,
  shortThoughtId,
  thoughtDateTime,
} from "../lib/thoughts.ts";
import { app } from "../rindle-client.ts";
import { ThoughtComposer, type EditableThought } from "./ThoughtComposer.tsx";

interface ThoughtTagLinkData {
  tag: { name: string; normalizedName: string } | readonly { name: string; normalizedName: string }[] | null;
}

interface ThoughtAttachmentData {
  id: string;
  fileName: string;
  mediaType: string;
  storageKey: string;
}

export interface ThoughtCardData extends EditableThought {
  createdAt: number;
  updatedAt: number;
  parentId: string | null;
  color: string | null;
  replyCount?: number;
  tagLinks?: readonly ThoughtTagLinkData[];
  attachments?: readonly ThoughtAttachmentData[];
  tasks?: readonly { id: string }[];
}

interface ThoughtCardProps {
  thought: ThoughtCardData;
  isAdmin: boolean;
  variant?: "feed" | "parent" | "reply";
  onDeleted?: (thought: ThoughtCardData) => void;
  onReply?: () => void;
  onToggleReplies?: () => void;
  repliesCollapsed?: boolean;
  visibleReplyCount?: number;
  inlineThread?: boolean;
}

function tagsFor(thought: ThoughtCardData): string[] {
  const names = new Set<string>();
  for (const link of thought.tagLinks ?? []) {
    const profile = Array.isArray(link.tag) ? link.tag[0] : link.tag;
    if (profile?.name) names.add(profile.name);
  }
  return [...names];
}

function enrichmentRoute(tag: string) {
  switch (tag) {
    case "p": return "/thoughts/projects" as const;
    case "t": return "/thoughts/tasks" as const;
    case "q": return "/thoughts/questions" as const;
    case "e": return "/thoughts/events" as const;
    case "l": return "/thoughts/locations" as const;
    case "b": return "/thoughts/books" as const;
    case "m": return "/thoughts/movies" as const;
    case "a": return "/thoughts/music" as const;
    default: return null;
  }
}

export function ThoughtCard({
  thought,
  isAdmin,
  variant = "feed",
  onDeleted,
  onReply,
  onToggleReplies,
  repliesCollapsed = false,
  visibleReplyCount = 0,
  inlineThread = false,
}: ThoughtCardProps) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const html = useMemo(() => renderThoughtMarkdown(thought.body), [thought.body]);
  const tags = tagsFor(thought);
  const semanticColor = thought.color && /^#[0-9a-f]{6}$/i.test(thought.color) ? thought.color : null;
  const style = semanticColor ? ({ "--thought-color": semanticColor } as CSSProperties) : undefined;
  const replyCount = thought.replyCount ?? 0;

  async function copyLink() {
    try {
      const url = `${window.location.origin}/thoughts/${encodeURIComponent(thought.id)}`;
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setActionError(null);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not copy the link.");
    }
  }

  function deleteThought() {
    const message = replyCount > 0
      ? `Delete this thought and its ${replyCount} ${replyCount === 1 ? "reply" : "replies"}?`
      : "Delete this thought?";
    if (!window.confirm(message)) return;
    try {
      app.mutate.deleteThought({ id: thought.id });
      onDeleted?.(thought);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not delete this thought.");
    }
  }

  return (
    <article
      className={`thought-card thought-card--${variant}${thought.private === 1 ? " is-private" : ""}`}
      style={style}
      data-thought-id={thought.id}
    >
      <header className="thought-card-header">
        <Link
          to="/thoughts/$id"
          params={{ id: thought.id }}
          className="thought-card-identity"
          title={`Thought ${thought.id}`}
        >
          <span className="thought-card-mark" aria-hidden="true" />
          <span className="thought-card-id">#{shortThoughtId(thought.id)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={thoughtDateTime(thought.createdAt)}>{formatThoughtTime(thought.createdAt)}</time>
          {thought.version > 1 ? <span className="thought-card-edited">edited v{thought.version}</span> : null}
          {thought.private === 1 ? <span className="thought-card-private">private</span> : null}
        </Link>

        {!editing ? (
          <div className="thought-card-actions">
            <button type="button" onClick={copyLink} aria-label="Copy thought link" title="Copy link">
              {copied ? "copied" : "share"}
            </button>
            {isAdmin ? (
              <>
                <button type="button" onClick={() => setEditing(true)}>edit</button>
                <button className="is-danger" type="button" onClick={deleteThought}>delete</button>
              </>
            ) : null}
          </div>
        ) : null}
      </header>

      {editing ? (
        <ThoughtComposer
          initial={thought}
          compact
          autoFocus
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {thought.parentId && variant === "parent" ? (
            <p className="thought-card-parent-link">
              in reply to <Link to="/thoughts/$id" params={{ id: thought.parentId }}>#{shortThoughtId(thought.parentId)}</Link>
            </p>
          ) : null}
          <div className="thought-markdown" dangerouslySetInnerHTML={{ __html: html }} />
          {tags.length > 0 ? (
            <div className="thought-tags" aria-label="Tags">
              {tags.map((tag) => {
                const to = enrichmentRoute(tag);
                return to
                  ? <Link key={tag} to={to}>#{tag}</Link>
                  : <span key={tag}>#{tag}</span>;
              })}
            </div>
          ) : null}
          {(thought.attachments?.length ?? 0) > 0 ? (
            <div className="thought-attachments" aria-label="Attachments">
              {thought.attachments?.map((attachment) => (
                <span key={attachment.id} title={attachment.mediaType}>{attachment.fileName}</span>
              ))}
            </div>
          ) : null}
        </>
      )}

      {!editing ? (
        <footer className="thought-card-footer">
          {onReply || onToggleReplies ? (
            <div>
              {onReply ? <button type="button" onClick={onReply}>reply</button> : null}
              {onToggleReplies ? (
                <button type="button" onClick={onToggleReplies}>
                  {repliesCollapsed ? "show" : "hide"} {visibleReplyCount} {visibleReplyCount === 1 ? "reply" : "replies"}
                </button>
              ) : null}
            </div>
          ) : null}
          <Link to="/thoughts/$id" params={{ id: thought.id }}>
            {inlineThread
              ? "open thread"
              : replyCount > 0
              ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
              : isAdmin ? "Reply" : "Open thought"}
            <span aria-hidden="true"> →</span>
          </Link>
        </footer>
      ) : null}
      {actionError ? <p className="thought-action-error" role="alert">{actionError}</p> : null}
    </article>
  );
}
