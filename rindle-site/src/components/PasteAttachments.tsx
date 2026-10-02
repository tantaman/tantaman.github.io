import { useState } from "react";
import type { PasteAttachment } from "../../shared/app-def.ts";
import { isPreviewableImage, uploadThoughtFiles } from "../lib/attachments.ts";
import { formatFileSize, pasteFileEmbed, pasteFileUrl } from "../lib/paste-attachments.ts";
import { app } from "../rindle-client.ts";
import { ThoughtFileDropzone, useThoughtFiles } from "./ThoughtFileDropzone.tsx";

export function PasteAttachments({ pasteId, files, manage = false }: {
  pasteId: string;
  files: readonly PasteAttachment[];
  manage?: boolean;
}) {
  const controller = useThoughtFiles("paste");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function upload() {
    if (saving || !controller.files.length) return;
    setSaving(true);
    setError(null);
    try {
      const attachments = await uploadThoughtFiles(controller.files);
      app.mutate.addPasteAttachments({ pasteId, attachments });
      controller.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not attach files.");
    } finally { setSaving(false); }
  }

  async function copy(file: PasteAttachment) {
    try {
      await navigator.clipboard.writeText(pasteFileEmbed(pasteId, file.fileName, file.mediaType));
      setCopied(file.id);
    } catch { setError("Could not copy the embed. Select and copy the snippet below."); }
  }

  function remove(file: PasteAttachment) {
    if (!window.confirm(`Remove “${file.fileName}” from this paste? Other forks keep their copies.`)) return;
    try { app.mutate.removePasteAttachment({ pasteId, fileName: file.fileName }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove the file."); }
  }

  if (!files.length && !manage) return null;
  return (
    <section className="paste-attachments" aria-label="Paste files">
      {files.length ? <h2>{files.length} file{files.length === 1 ? "" : "s"}</h2> : null}
      <div className="paste-file-gallery">
        {files.filter((file) => isPreviewableImage(file.mediaType) || file.mediaType.startsWith("video/")).map((file) => {
          const url = pasteFileUrl(pasteId, file.fileName);
          return <figure key={file.id}>
            {isPreviewableImage(file.mediaType)
              ? <a href={url}><img src={url} alt={file.fileName} loading="lazy" /></a>
              : ["video/mp4", "video/webm", "video/ogg"].includes(file.mediaType)
                ? <video controls preload="metadata" src={url} aria-label={file.fileName} /> : null}
            <figcaption>{file.fileName}</figcaption>
          </figure>;
        })}
      </div>
      {files.length ? <ul className="paste-file-list">
        {files.map((file) => <li key={file.id}>
          <div className="paste-file-info">
            <a href={pasteFileUrl(pasteId, file.fileName)}>{file.fileName}</a>
            <small>{file.mediaType} · {formatFileSize(file.size)}</small>
            {manage ? <code>{pasteFileEmbed(pasteId, file.fileName, file.mediaType)}</code> : null}
          </div>
          <div className="paste-file-actions">
            <a href={pasteFileUrl(pasteId, file.fileName, true)}>download</a>
            {manage ? <>
              <button type="button" onClick={() => void copy(file)}>{copied === file.id ? "copied" : "copy embed"}</button>
              <button type="button" onClick={() => remove(file)}>remove</button>
            </> : null}
          </div>
        </li>)}
      </ul> : null}
      {manage ? <details className="paste-file-manager">
        <summary>Attach files</summary>
        <p>Upload the same filename to replace it in this paste.</p>
        <ThoughtFileDropzone controller={controller} disabled={saving}><span /></ThoughtFileDropzone>
        <button type="button" className="paste-button" disabled={saving || !controller.files.length} onClick={() => void upload()}>
          {saving ? "Uploading…" : "Upload files"}
        </button>
      </details> : null}
      {error || controller.error ? <p className="paste-error" role="alert">{error ?? controller.error}</p> : null}
    </section>
  );
}
