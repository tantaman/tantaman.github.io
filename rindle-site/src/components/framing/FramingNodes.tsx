import { memo, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ulid } from "ulid";

import type { PasteLanguage } from "../../../shared/app-def.ts";
import { extractPasteTitle, PASTE_LANGUAGE_OPTIONS, pasteExcerpt } from "../../lib/paste.ts";
import { app } from "../../rindle-client.ts";

import { renderThoughtMarkdown } from "../../lib/thoughts.ts";
import { attachmentPreviewUrl, isPreviewableImage } from "../../lib/attachments.ts";
import { ItemCard, type EnrichmentItemTarget } from "../ItemCard.tsx";
import { ThoughtComposer } from "../ThoughtComposer.tsx";

export interface ThoughtNodeData extends Record<string, unknown> {
  body: string;
  createdAt: number;
  thoughtId: string;
  nodeId: string;
  color: string | null;
  replyCount: number;
  linkCount: number;
  backlinkCount: number;
  attachments: readonly {
    id: string;
    storageKey: string;
    mediaType: string;
    fileName: string;
  }[];
  editable: boolean;
  onRemove?: (nodeId: string) => void;
  onExpandReplies?: (nodeId: string) => void;
  onExpandLinks?: (nodeId: string) => void;
  onExpandBacklinks?: (nodeId: string) => void;
}

export interface PostNodeData extends Record<string, unknown> {
  nodeId: string;
  slug: string;
  title: string;
  description: string;
  date: string | null;
  tags: string[];
  color: string | null;
  editable: boolean;
  onRemove?: (nodeId: string) => void;
}

export interface NestedFramingNodeData extends Record<string, unknown> {
  nodeId: string;
  framingId: string;
  title: string | null;
  private: boolean;
  editable: boolean;
  onRemove?: (nodeId: string) => void;
}

/** Every enrichment kind shares one node: the card knows how to draw a movie, a task, or a bookmark,
 *  so the canvas only owns the chrome around it (removal, ports). Thoughts, posts, and nested
 *  framings keep bespoke nodes because they carry canvas behavior a card has no business owning. */
export interface ItemNodeData extends Record<string, unknown> {
  nodeId: string;
  target: EnrichmentItemTarget;
  editable: boolean;
  onRemove?: (nodeId: string) => void;
}

/** What a double-click on the canvas can mint in place. */
export type ComposeKind = "thought" | "paste";

export interface ComposeNodeData extends Record<string, unknown> {
  onDone: (kind: ComposeKind, itemId: string) => void;
  onCancel: () => void;
}

export type ThoughtFlowNode = Node<ThoughtNodeData, "thought">;
export type PostFlowNode = Node<PostNodeData, "post">;
export type NestedFramingFlowNode = Node<NestedFramingNodeData, "framing">;
export type ComposeFlowNode = Node<ComposeNodeData, "compose">;
export type ItemFlowNode = Node<ItemNodeData, "item">;
export type FramingFlowNode =
  | ThoughtFlowNode
  | PostFlowNode
  | NestedFramingFlowNode
  | ItemFlowNode
  | ComposeFlowNode;

function Ports() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </>
  );
}

type ExpansionKind = "replies" | "links" | "backlinks";

export const FramingThoughtNode = memo(function FramingThoughtNode({ data }: NodeProps<ThoughtFlowNode>) {
  const [busy, setBusy] = useState<ExpansionKind | null>(null);
  const [pucked, setPucked] = useState(false);
  const body = data.body.length > 500 ? `${data.body.slice(0, 500)}…` : data.body;
  const html = renderThoughtMarkdown(body);
  const style = data.color && /^#[0-9a-f]{6}$/i.test(data.color)
    ? (pucked
      ? { backgroundColor: data.color, borderColor: data.color }
      : { "--framing-node-color": data.color }) as CSSProperties
    : undefined;

  function expand(kind: ExpansionKind, callback: ((nodeId: string) => void) | undefined) {
    if (!callback || busy) return;
    setBusy(kind);
    callback(data.nodeId);
    window.setTimeout(() => setBusy(null), 300);
  }

  const stop = (event: MouseEvent) => event.stopPropagation();
  return (
    <div className={`framing-thought-node${pucked ? " framing-thought-node--pucked" : ""}`} style={style}>
      <button
        type="button"
        className="framing-node-puck-toggle nodrag"
        onClick={(event) => { event.stopPropagation(); setPucked((value) => !value); }}
        onMouseDown={stop}
        title={pucked ? "Expand" : "Collapse to puck"}
      >
        {pucked ? "⤢" : "◌"}
      </button>
      {data.editable && data.onRemove && !pucked ? (
        <button
          type="button"
          className="framing-node-remove nodrag"
          onClick={(event) => { event.stopPropagation(); data.onRemove?.(data.nodeId); }}
          title="Remove from framing"
        >×</button>
      ) : null}
      <div className="thought-markdown framing-node-body" dangerouslySetInnerHTML={{ __html: html }} />
      {!pucked && data.attachments.some((attachment) => isPreviewableImage(attachment.mediaType)) ? (
        <div className="framing-node-images">
          {data.attachments.filter((attachment) => isPreviewableImage(attachment.mediaType)).map((attachment) => (
            <img
              key={attachment.id}
              src={attachmentPreviewUrl(attachment.storageKey)}
              alt={attachment.fileName}
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      ) : null}
      {!pucked && data.replyCount > 0 ? (
        <button
          type="button"
          className="framing-node-expand framing-node-expand-replies nodrag"
          onClick={(event) => { event.stopPropagation(); expand("replies", data.onExpandReplies); }}
          onMouseDown={stop}
          disabled={!data.editable || busy !== null}
          title={`Expand ${data.replyCount} ${data.replyCount === 1 ? "reply" : "replies"}`}
        >{busy === "replies" ? "…" : "↓"} {data.replyCount}</button>
      ) : null}
      {!pucked && data.backlinkCount > 0 ? (
        <button
          type="button"
          className="framing-node-expand framing-node-expand-backlinks nodrag"
          onClick={(event) => { event.stopPropagation(); expand("backlinks", data.onExpandBacklinks); }}
          onMouseDown={stop}
          disabled={!data.editable || busy !== null}
          title={`Expand ${data.backlinkCount} backlinks`}
        >{busy === "backlinks" ? "…" : "←"} {data.backlinkCount}</button>
      ) : null}
      {!pucked && data.linkCount > 0 ? (
        <button
          type="button"
          className="framing-node-expand framing-node-expand-links nodrag"
          onClick={(event) => { event.stopPropagation(); expand("links", data.onExpandLinks); }}
          onMouseDown={stop}
          disabled={!data.editable || busy !== null}
          title={`Expand ${data.linkCount} links`}
        >{data.linkCount} {busy === "links" ? "…" : "→"}</button>
      ) : null}
      <Ports />
    </div>
  );
});

export const FramingPostNode = memo(function FramingPostNode({ data }: NodeProps<PostFlowNode>) {
  const summary = data.description.length > 200 ? `${data.description.slice(0, 200)}…` : data.description;
  return (
    <div className="framing-post-node" style={data.color ? { borderLeftColor: data.color } : undefined}>
      {data.editable && data.onRemove ? (
        <button
          type="button"
          className="framing-node-remove nodrag"
          onClick={(event) => { event.stopPropagation(); data.onRemove?.(data.nodeId); }}
          title="Remove from framing"
        >×</button>
      ) : null}
      <a className="framing-post-node-title nodrag" href={`/${data.slug}`} target="_blank" rel="noreferrer">
        {data.title}
      </a>
      {data.date ? <div className="framing-post-node-date">{data.date}</div> : null}
      {summary ? <div className="framing-post-node-summary">{summary}</div> : null}
      {data.tags.length > 0 ? (
        <div className="framing-post-node-tags">
          {data.tags.map((tag) => <span className="framing-post-node-tag" key={tag}>{tag}</span>)}
        </div>
      ) : null}
      <Ports />
    </div>
  );
});

export const FramingNestedNode = memo(function FramingNestedNode({ data }: NodeProps<NestedFramingFlowNode>) {
  const navigate = useNavigate();
  function open(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    void navigate({ to: "/thoughts/framings/$id", params: { id: data.framingId } });
  }
  return (
    <div className="framing-framing-node" onDoubleClick={open} title="Double-click to enter">
      {data.editable && data.onRemove ? (
        <button
          type="button"
          className="framing-node-remove nodrag"
          onClick={(event) => { event.stopPropagation(); data.onRemove?.(data.nodeId); }}
          title="Remove from framing"
        >×</button>
      ) : null}
      <div className="framing-framing-node-icon" aria-hidden="true">⌘</div>
      <a
        href={`/thoughts/framings/${encodeURIComponent(data.framingId)}`}
        className="framing-framing-node-title nodrag"
        onClick={open}
        draggable={false}
      >
        {data.title || "Untitled framing"}
      </a>
      {data.private ? <span className="framing-privacy-badge">private</span> : null}
      <button type="button" className="framing-framing-node-enter nodrag" onClick={open} title="Enter framing">↗</button>
      <Ports />
    </div>
  );
});

export const FramingItemNode = memo(function FramingItemNode({ data }: NodeProps<ItemFlowNode>) {
  return (
    <div className={`framing-item-node item-hue--${data.target.kind}`}>
      {data.editable && data.onRemove ? (
        <button
          type="button"
          className="framing-node-remove nodrag"
          onClick={(event) => { event.stopPropagation(); data.onRemove?.(data.nodeId); }}
          title="Remove from framing"
        >×</button>
      ) : null}
      <ItemCard target={data.target} />
      <Ports />
    </div>
  );
});

export const FramingComposeNode = memo(function FramingComposeNode({ data }: NodeProps<ComposeFlowNode>) {
  const [kind, setKind] = useState<ComposeKind>("thought");
  return (
    <div className="framing-compose-node nodrag">
      <div className="framing-compose-kind" role="radiogroup" aria-label="Create a">
        {(["thought", "paste"] as const).map((option) => (
          <button
            type="button"
            key={option}
            role="radio"
            aria-checked={kind === option}
            className={kind === option ? "is-active" : undefined}
            onClick={() => setKind(option)}
          >{option === "thought" ? "Thought" : "Paste"}</button>
        ))}
      </div>
      {kind === "thought" ? (
        <ThoughtComposer
          compact
          autoFocus
          placeholder="Write a new thought…"
          submitLabel="Create"
          onDone={(thoughtId) => data.onDone("thought", thoughtId)}
          onCancel={data.onCancel}
        />
      ) : (
        <PasteComposer onDone={(pasteId) => data.onDone("paste", pasteId)} onCancel={data.onCancel} />
      )}
    </div>
  );
});

/** The paste bin's editor, cut down to what fits on a canvas. The paste is created unlisted, as it
 *  is from /paste; sharing stays on the paste's own page. */
function PasteComposer({ onDone, onCancel }: { onDone: (pasteId: string) => void; onCancel: () => void }) {
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState<PasteLanguage>("markdown");
  const [error, setError] = useState<string | null>(null);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    const id = ulid();
    try {
      app.mutate.createPaste({
        paste: {
          id,
          body,
          excerpt: pasteExcerpt(body),
          language,
          title: extractPasteTitle(body, language),
          createdAt: Date.now(),
          parentId: null,
        },
      });
      onDone(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the paste.");
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") { event.preventDefault(); onCancel(); return; }
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="thought-composer thought-composer--compact framing-compose-paste" onSubmit={save}>
      <select
        className="framing-compose-language"
        aria-label="Language"
        value={language}
        onChange={(event) => setLanguage(event.target.value as PasteLanguage)}
      >
        {PASTE_LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <textarea
        rows={6}
        value={body}
        autoFocus
        spellCheck={language === "markdown" || language === "plaintext"}
        placeholder="Paste or write something…"
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="thought-composer-footer">
        <button className="thought-button thought-button--quiet" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="thought-button thought-button--primary" type="submit" disabled={!body.trim()}>
          Create
        </button>
      </div>
      {error ? <p className="paste-error" role="alert">{error}</p> : null}
    </form>
  );
}
