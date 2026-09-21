import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { ulid } from "ulid";

import {
  MAX_THOUGHT_FILE_BYTES,
  attachmentKindLabel,
  attachmentMediaType,
  clipboardFiles,
  isPreviewableImage,
  pasteTextIsFileNames,
  pastedFileName,
  type PendingThoughtFile,
} from "../lib/attachments.ts";

const MAX_THOUGHT_FILES = 100;

export interface ThoughtFileController {
  files: readonly PendingThoughtFile[];
  error: string | null;
  addFiles: (files: FileList | readonly File[]) => void;
  remove: (id: string) => void;
  reset: () => void;
}

export function useThoughtFiles(): ThoughtFileController {
  const [files, setFiles] = useState<PendingThoughtFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => () => {
    for (const entry of filesRef.current) if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
  }, []);

  function addFiles(candidates: FileList | readonly File[]) {
    const accepted: PendingThoughtFile[] = [];
    let nextError: string | null = null;
    for (const file of Array.from(candidates)) {
      if (file.size === 0) {
        nextError = `${file.name || "That file"} is empty.`;
        continue;
      }
      if (file.size > MAX_THOUGHT_FILE_BYTES) {
        nextError = `${file.name || "That file"} is larger than 15 MB.`;
        continue;
      }
      accepted.push({
        id: ulid(),
        file,
        previewUrl: isPreviewableImage(attachmentMediaType(file)) ? URL.createObjectURL(file) : null,
        createdAt: Date.now(),
      });
    }
    const remaining = Math.max(0, MAX_THOUGHT_FILES - filesRef.current.length);
    const added = accepted.slice(0, remaining);
    for (const entry of accepted.slice(remaining)) if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    if (added.length < accepted.length) nextError = `A thought can have up to ${MAX_THOUGHT_FILES} files.`;
    setFiles((current) => [...current, ...added]);
    setError(nextError);
  }

  function remove(id: string) {
    setFiles((current) => {
      const removed = current.find((entry) => entry.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
    setError(null);
  }

  function reset() {
    for (const entry of filesRef.current) if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    setFiles([]);
    setError(null);
  }

  return { files, error, addFiles, remove, reset };
}

/**
 * Files carried by a paste, renamed where the browser made the name up. Copied bitmaps all arrive
 * as `image.png`; the timestamped replacement keeps several pasted screenshots distinguishable.
 */
function filesFromPaste(data: DataTransfer | null): File[] {
  const now = new Date();
  return clipboardFiles(data).map((file, index) => {
    const name = pastedFileName(file, now, index);
    return name === file.name ? file : new File([file], name, { type: file.type, lastModified: file.lastModified });
  });
}

export function ThoughtFileDropzone({
  controller,
  children,
  compact = false,
}: {
  controller: ThoughtFileController;
  children: ReactNode;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) controller.addFiles(event.dataTransfer.files);
  }

  /**
   * Paste events bubble up from the textarea (or anything else) inside the zone. A paste that
   * carries files stages them; its text still lands in the textarea unless that text is only the
   * pasted files' own names, which is what a file copied from Finder or Explorer brings along.
   */
  function paste(event: ClipboardEvent<HTMLDivElement>) {
    const files = filesFromPaste(event.clipboardData);
    if (files.length === 0) return;
    controller.addFiles(files);
    if (pasteTextIsFileNames(event.clipboardData.getData("text/plain"), files)) event.preventDefault();
  }

  return (
    <div
      className={`thought-file-dropzone${dragging ? " is-dragging" : ""}${compact ? " is-compact" : ""}`}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.stopPropagation();
          setDragging(true);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setDragging(false);
      }}
      onDrop={drop}
      onPaste={paste}
    >
      {children}
      {controller.files.length > 0 ? (
        <div className="thought-file-staging" aria-label="Files to attach">
          {controller.files.map((entry) => (
            <figure key={entry.id}>
              {entry.previewUrl ? (
                <img src={entry.previewUrl} alt={entry.file.name} />
              ) : (
                <div className="thought-file-badge" aria-hidden="true">
                  <span>{attachmentKindLabel(entry.file.name, attachmentMediaType(entry.file))}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => controller.remove(entry.id)}
                aria-label={`Remove ${entry.file.name}`}
                title={`Remove ${entry.file.name}`}
              >×</button>
              <figcaption title={entry.file.name}>{entry.file.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      <div className="thought-file-prompt">
        <button type="button" onClick={() => inputRef.current?.click()}>Add files</button>
        <span>or paste / drop them here</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          tabIndex={-1}
          onChange={(event) => {
            if (event.target.files) controller.addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {dragging ? <div className="thought-file-drop-overlay">Drop files to attach</div> : null}
    </div>
  );
}
