import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ulid } from "ulid";

import type { PasteLanguage } from "../../shared/app-def.ts";
import { app, onRejection } from "../rindle-client.ts";
import { pasteLocalEmbed } from "../lib/paste-attachments.ts";
import { attachmentMediaType } from "../lib/attachments.ts";
import {
  extractPasteTitle,
  PASTE_LANGUAGE_OPTIONS,
  pasteExcerpt,
} from "../lib/paste.ts";
import type { PasteListRow } from "./Paste.queries.ts";
import { uploadThoughtFiles } from "../lib/attachments.ts";
import { PasteAttachments } from "./PasteAttachments.tsx";
import type { PasteAttachment } from "../../shared/app-def.ts";
import { ThoughtFileDropzone, useThoughtFiles } from "./ThoughtFileDropzone.tsx";
import { PasteList } from "./PasteList.tsx";

interface ForkSource {
  id: string;
  title: string | null;
  body: string;
  language: string;
  attachments?: readonly PasteAttachment[];
  contentRevision?: string;
}

function knownLanguage(value: string): PasteLanguage {
  return PASTE_LANGUAGE_OPTIONS.some((option) => option.value === value)
    ? (value as PasteLanguage)
    : "markdown";
}

export function PasteEditor({
  recent,
  source,
  editing = false,
}: {
  recent: readonly PasteListRow[];
  source?: ForkSource;
  editing?: boolean;
}) {
  const navigate = useNavigate();
  const fileController = useThoughtFiles("paste");
  const [body, setBody] = useState(source?.body ?? "");
  const [language, setLanguage] = useState<PasteLanguage>(knownLanguage(source?.language ?? "markdown"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedRevision] = useState(source?.contentRevision ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertFile(fileName: string, mediaType: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? start;
    const snippet = pasteLocalEmbed(fileName, mediaType);
    setBody(body.slice(0, start) + snippet + body.slice(end));
    requestAnimationFrame(() => { textarea?.focus(); textarea?.setSelectionRange(start + snippet.length, start + snippet.length); });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!body.trim() && fileController.files.length === 0 && !source?.attachments?.length) || saving) return;
    setSaving(true);
    setError(null);
    const id = editing && source ? source.id : ulid();
    try {
      if (editing && source?.contentRevision !== expectedRevision) throw new Error("This paste changed since you opened it. Copy your draft, then reload before saving.");
      const attachments = await uploadThoughtFiles(fileController.files);
      if (editing) {
        const revisionId = ulid();
        let rejected: string | null = null;
        const unsubscribe = onRejection((envelope, reason) => {
          if (envelope.name === "editPaste" && (envelope.args as { revisionId?: string }).revisionId === revisionId) rejected = reason;
        });
        try {
          app.mutate.editPaste({ id, revisionId, expectedRevision, updatedAt: Date.now(), body, excerpt: pasteExcerpt(body), language, title: extractPasteTitle(body, language), attachments });
          // Keep the editor and its draft until the named server read confirms this save.
          const deadline = Date.now() + 15_000;
          while (true) {
            if (rejected) throw new Error(rejected);
            const response = await fetch("/api/rindle/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "paste", args: id }), signal: AbortSignal.timeout(5_000) });
            if (!response.ok) throw new Error("Could not confirm the save. Your text is still in the editor.");
            const result = await response.json() as { rows?: { cols: { contentRevision?: string } }[] };
            if (result.rows?.[0]?.cols.contentRevision === revisionId) break;
            if (Date.now() >= deadline) throw new Error("The save is still pending. Your text is still in the editor; check the paste before retrying.");
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        } finally { unsubscribe(); }
      } else {
        app.mutate.createPaste({
          attachments,
          paste: {
            id,
            body,
            excerpt: pasteExcerpt(body),
            language,
            title: extractPasteTitle(body, language) ?? attachments[0]?.fileName ?? null,
            createdAt: Date.now(),
            parentId: source?.id ?? null,
          },
        });
      }
      await navigate({ to: "/paste/$id", params: { id } });
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof Error ? cause.message : "Could not save the paste.");
    }
  }

  function submitFromKeyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const textarea = (
    <textarea
      ref={textareaRef}
      value={body}
      disabled={saving}
      required={fileController.files.length === 0 && !source?.attachments?.length}
      autoFocus
      spellCheck={language === "markdown" || language === "plaintext"}
      placeholder="Write something…"
      onChange={(event) => setBody(event.target.value)}
      onKeyDown={submitFromKeyboard}
    />
  );

  return (
    <section className="paste-editor-page">
      {source ? (
        <p className="paste-fork-note">
          {editing ? "Editing" : "Forking"} <Link to="/paste/$id" params={{ id: source.id }}>{source.title || "Untitled"}</Link>
        </p>
      ) : null}

      <form className="paste-editor" onSubmit={(event) => void save(event)}>
        <div className="paste-editor-toolbar">
          <label htmlFor="paste-language">Language</label>
          <select
            id="paste-language"
            disabled={saving}
            value={language}
            onChange={(event) => setLanguage(event.target.value as PasteLanguage)}
          >
            {PASTE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {source ? (
            <button className="paste-button paste-button--quiet" type="button" disabled={saving} onClick={() => { setBody(""); fileController.reset(); }}>
              Clear
            </button>
          ) : null}
        </div>
        <ThoughtFileDropzone controller={fileController} disabled={saving}>
          {textarea}
        </ThoughtFileDropzone>
        {language === "markdown" ? <div className="paste-inline-files">
          <p>Place a file inline with <code>![description](filename.png)</code>. Videos use the same syntax.</p>
          {[...(source?.attachments ?? []).map((file) => ({ fileName: file.fileName, mediaType: file.mediaType })), ...fileController.files.map(({ file }) => ({ fileName: file.name, mediaType: attachmentMediaType(file) }))]
            .filter((file, index, files) => files.findIndex((other) => other.fileName === file.fileName) === index)
            .map((file) => <button className="paste-button paste-button--quiet" key={file.fileName} type="button" disabled={saving} onClick={() => insertFile(file.fileName, file.mediaType)}>Insert {file.fileName}</button>)}
        </div> : null}
        {source?.attachments?.length ? (
          <div className="paste-inherited-files">
            <p>{editing ? "Attached files. Upload the same filename to replace it." : "Files inherited from the original. Upload the same filename to replace it in this fork."}</p>
            <PasteAttachments pasteId={source.id} files={source.attachments} />
          </div>
        ) : null}
        <div className="paste-editor-actions">
          <button className="paste-button paste-button--primary" type="submit" disabled={saving || (!body.trim() && fileController.files.length === 0 && !source?.attachments?.length)}>
            {saving ? "Saving…" : editing ? "Save changes" : "Save"}
          </button>
          {editing && source ? <Link to="/paste/$id" params={{ id: source.id }}>Cancel</Link> : null}
          <span>Cmd/Ctrl + Enter</span>
        </div>
        {error || fileController.error ? <p className="paste-error" role="alert">{error ?? fileController.error}</p> : null}
      </form>

      {!editing ? <section className="paste-recents" aria-labelledby="paste-recents-heading">
        <div className="paste-section-heading">
          <h2 id="paste-recents-heading">Recent</h2>
          <Link to="/paste/all">all</Link>
        </div>
        <PasteList rows={recent} empty="No pastes yet." showShared />
      </section> : null}
    </section>
  );
}
