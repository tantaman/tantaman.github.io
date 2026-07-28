import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ulid } from "ulid";

import type { Thought } from "../../shared/app-def.ts";
import { uploadThoughtImages } from "../lib/attachments.ts";
import {
  extractThoughtTags,
  hashThoughtBody,
  renderThoughtMarkdown,
  thoughtEnrichmentArgs,
  thoughtTagArgs,
} from "../lib/thoughts.ts";
import { app } from "../rindle-client.ts";
import { ThoughtImageDropzone, useThoughtImages } from "./ThoughtImageDropzone.tsx";

export type EditableThought = Pick<Thought, "id" | "body" | "version" | "private">;

interface ThoughtComposerProps {
  parentId?: string;
  parentTaskIds?: readonly string[];
  initial?: EditableThought;
  defaultPrivate?: boolean;
  placeholder?: string;
  submitLabel?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onDone?: (thoughtId: string) => void;
  onCancel?: () => void;
}

export function ThoughtComposer({
  parentId,
  parentTaskIds,
  initial,
  defaultPrivate = false,
  placeholder,
  submitLabel,
  compact = false,
  autoFocus = false,
  onDone,
  onCancel,
}: ThoughtComposerProps) {
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPrivate, setIsPrivate] = useState(initial ? initial.private === 1 : defaultPrivate);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageController = useThoughtImages();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const tags = useMemo(() => extractThoughtTags(body), [body]);
  const previewHtml = useMemo(() => previewing ? renderThoughtMarkdown(body) : "", [body, previewing]);
  const mode = initial ? "edit" : parentId ? "reply" : "create";
  const label = submitLabel ?? (mode === "edit" ? "Save revision" : mode === "reply" ? "Reply" : "Post thought");

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || previewing) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, compact ? 92 : 132)}px`;
  }, [body, compact, previewing]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something first.");
      textareaRef.current?.focus();
      return;
    }

    const unchanged = initial
      && trimmed === initial.body
      && isPrivate === (initial.private === 1)
      && imageController.images.length === 0;
    if (unchanged) {
      onDone?.(initial.id);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const [bodyHash, attachments] = await Promise.all([
        hashThoughtBody(trimmed),
        uploadThoughtImages(imageController.images),
      ]);
      const now = Date.now();
      const contentRevision = ulid();

      if (initial) {
        app.mutate.editThought({
          id: initial.id,
          expectedVersion: initial.version,
          historyId: ulid(),
          body: trimmed,
          bodyHash,
          updatedAt: now,
          contentRevision,
          private: isPrivate ? 1 : 0,
          tags: thoughtTagArgs(trimmed),
          attachments,
        });
        imageController.reset();
        onDone?.(initial.id);
        return;
      }

      const thoughtId = ulid();
      app.mutate.createThought({
        thought: {
          id: thoughtId,
          body: trimmed,
          bodyHash,
          createdAt: now,
          updatedAt: now,
          parentId: parentId ?? null,
          private: isPrivate ? 1 : 0,
          contentRevision,
        },
        tags: thoughtTagArgs(trimmed),
        attachments,
        edges: [],
        enrichments: thoughtEnrichmentArgs(trimmed, now, contentRevision, {
          taskIds: parentTaskIds ?? [],
        }),
      });
      setBody("");
      setPreviewing(false);
      imageController.reset();
      onDone?.(thoughtId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this thought.");
    } finally {
      setSubmitting(false);
    }
  }

  function submitFromKeyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form
      className={`thought-composer thought-composer--${mode}${compact ? " thought-composer--compact" : ""}`}
      onSubmit={submit}
    >
      <div className="thought-composer-tabs" role="tablist" aria-label="Composer view">
        <button
          type="button"
          role="tab"
          aria-selected={!previewing}
          className={!previewing ? "is-active" : undefined}
          onClick={() => setPreviewing(false)}
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={previewing}
          className={previewing ? "is-active" : undefined}
          onClick={() => setPreviewing(true)}
        >
          Preview
        </button>
      </div>

      <ThoughtImageDropzone controller={imageController} compact={compact}>
        {previewing ? (
          <div
            className="thought-markdown thought-composer-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            rows={compact ? 3 : 5}
            value={body}
            autoFocus={autoFocus}
            spellCheck
            placeholder={placeholder ?? (parentId ? "Write a reply…" : "What are you thinking? Try #t, #p, #q, #e, #l, #b, #m, or #a at the start of a line.")}
            aria-describedby={hintId}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={submitFromKeyboard}
          />
        )}
      </ThoughtImageDropzone>

      {tags.length > 0 ? (
        <div className="thought-composer-tags" aria-label="Detected tags">
          {tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      ) : null}

      <div className="thought-composer-footer">
        <p id={hintId}>Markdown · structured line tags · Cmd/Ctrl + Enter</p>
        <label className="thought-private-toggle">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
          />
          <span aria-hidden="true" />
          Private
        </label>
        {onCancel ? (
          <button className="thought-button thought-button--quiet" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button className="thought-button thought-button--primary" type="submit" disabled={submitting || !body.trim()}>
          {submitting ? "Saving…" : label}
        </button>
      </div>
      {error || imageController.error ? (
        <p className="thought-composer-error" role="alert">{error ?? imageController.error}</p>
      ) : null}
    </form>
  );
}
