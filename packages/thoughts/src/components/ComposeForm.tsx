import {
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  type FormEvent,
  type KeyboardEvent,
  type DragEvent,
  type ClipboardEvent,
} from 'react';
import { postThought, editThought } from '../api';
import { AuthContext } from '../auth-context';
import { renderMarkdown } from '../markdown';
import { useDictation } from '../hooks/useDictation';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

export function ComposeForm({
  parentId,
  editId,
  initialBody,
  placeholder,
  submitLabel,
  defaultPrivate,
  onPosted,
  onCancel,
}: {
  parentId?: number;
  editId?: number;
  initialBody?: string;
  placeholder?: string;
  submitLabel?: string;
  defaultPrivate?: boolean;
  onPosted: (thought: ReturnType<typeof postThought> extends Promise<infer T> ? T : never) => void;
  onCancel?: () => void;
}) {
  const { secret, updateSecret } = useContext(AuthContext);
  const [text, setText] = useState(initialBody ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [isPrivate, setIsPrivate] = useState(defaultPrivate ?? false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<Map<File, string>>(new Map());
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounter = useRef(0);

  const { listening, supported: micSupported, toggle: toggleMic } = useDictation(
    useCallback((transcript: string) => {
      const ta = textareaRef.current;
      const pos = ta?.selectionStart ?? text.length;
      const needsSpace = pos > 0 && !/\s$/.test(text.slice(0, pos));
      const insert = (needsSpace ? ' ' : '') + transcript;
      setText((prev) => {
        const p = ta?.selectionStart ?? prev.length;
        return prev.slice(0, p) + insert + prev.slice(p);
      });
    }, [text]),
  );

  const label = submitLabel || (editId != null ? 'Save revision' : parentId != null ? 'Reply' : 'Post');

  // Auto-grow the textarea to fit its content so more of what's typed is visible
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta || preview) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text, preview]);

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const addFiles = useCallback((incoming: File[]) => {
    const valid: File[] = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds 5MB limit`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    setFiles((prev) => [...prev, ...valid]);

    // Generate previews for image files
    const newPreviews = new Map<File, string>();
    for (const file of valid) {
      if (isImageType(file.type)) {
        newPreviews.set(file, URL.createObjectURL(file));
      }
    }
    if (newPreviews.size > 0) {
      setPreviews((prev) => {
        const merged = new Map(prev);
        newPreviews.forEach((url, file) => merged.set(file, url));
        return merged;
      });
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      setPreviews((prevPreviews) => {
        const url = prevPreviews.get(file);
        if (url) {
          URL.revokeObjectURL(url);
          const next = new Map(prevPreviews);
          next.delete(file);
          return next;
        }
        return prevPreviews;
      });
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(new Map());
    setFiles([]);
    if (fileRef.current) fileRef.current.value = '';
  }, [previews]);

  const handleFileChange = () => {
    const input = fileRef.current;
    if (!input?.files || input.files.length === 0) return;
    addFiles(Array.from(input.files));
    input.value = '';
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && isImageType(item.type)) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);

    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length > 0) {
      addFiles(Array.from(dropped));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !secret) return;

    setSubmitting(true);
    try {
      const t = editId != null
        ? await editThought(
            editId,
            { body, isPrivate },
            secret,
            files.length > 0 ? files : undefined,
          )
        : await postThought(
            body,
            secret,
            parentId,
            files.length > 0 ? files : undefined,
            isPrivate || undefined,
          );
      setText('');
      clearFiles();
      onPosted(t);
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        updateSecret(null);
      } else {
        alert(editId != null ? 'Failed to save revision' : parentId != null ? 'Failed to post reply' : 'Failed to post thought');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      (e.target as HTMLElement).closest('form')?.requestSubmit();
    }
  };

  const fileInputId = `file-${parentId ?? 'root'}-${Date.now()}`;
  const previewHtml = useMemo(() => ({ __html: renderMarkdown(text) }), [text]);

  return (
    <form className={parentId != null ? 'reply-form' : undefined} onSubmit={handleSubmit}>
      <div
        className={`compose-area${dragging ? ' compose-area--drag-over' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="compose-tabs">
          <button
            type="button"
            className={'compose-tab' + (!preview ? ' compose-tab--active' : '')}
            onClick={() => setPreview(false)}
          >
            Write
          </button>
          <button
            type="button"
            className={'compose-tab' + (preview ? ' compose-tab--active' : '')}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
        {preview ? (
          <div
            className="thought-body thought-body--md compose-preview"
            dangerouslySetInnerHTML={previewHtml}
          />
        ) : (
          <textarea
            ref={textareaRef}
            placeholder={placeholder || "What's on your mind? (markdown supported)"}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        )}
        {dragging && (
          <div className="compose-drop-overlay">
            Drop files here
          </div>
        )}
      </div>
      {files.length > 0 && (
        <div className="compose-previews">
          {files.map((file, i) => (
            <div key={`${file.name}-${file.size}-${i}`} className="compose-preview-item">
              {previews.has(file) ? (
                <img
                  src={previews.get(file)}
                  alt={file.name}
                  className="compose-preview-img"
                />
              ) : (
                <span className="compose-preview-name">{file.name}</span>
              )}
              <button
                type="button"
                className="compose-preview-remove"
                onClick={() => removeFile(i)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="compose-file-row">
        <label className="compose-file-btn" htmlFor={fileInputId}>
          Attach files
        </label>
        {micSupported && (
          <button
            type="button"
            className={`compose-mic${listening ? ' compose-mic--active' : ''}`}
            onClick={toggleMic}
            title={listening ? 'Stop dictation' : 'Start dictation'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
          </button>
        )}
        <input
          type="file"
          id={fileInputId}
          ref={fileRef}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {files.length > 0 && (
          <button
            type="button"
            className="compose-file-clear"
            style={{ display: 'inline' }}
            onClick={clearFiles}
          >
            Clear all
          </button>
        )}
        <label className="compose-private-toggle">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <span className="toggle-track" />
          Private
        </label>
        {onCancel && (
          <button
            type="button"
            className="compose-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={parentId != null ? 'reply-submit' : 'thought-submit'}
          style={{ marginLeft: 'auto' }}
          disabled={submitting}
        >
          {submitting ? 'Posting...' : label}
        </button>
      </div>
    </form>
  );
}
