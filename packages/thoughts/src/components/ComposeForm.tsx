import {
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { postThought } from '../api';
import { AuthContext } from '../App';
import { renderMarkdown } from '../markdown';

export function ComposeForm({
  parentId,
  placeholder,
  submitLabel,
  onPosted,
}: {
  parentId?: number;
  placeholder?: string;
  submitLabel?: string;
  onPosted: (thought: ReturnType<typeof postThought> extends Promise<infer T> ? T : never) => void;
}) {
  const { secret, updateSecret } = useContext(AuthContext);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const label = submitLabel || (parentId != null ? 'Reply' : 'Post');

  const handleFileChange = () => {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) {
      setFileNames([]);
      return;
    }
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) {
        alert(`File "${files[i].name}" exceeds 5MB limit`);
        if (fileRef.current) fileRef.current.value = '';
        setFileNames([]);
        return;
      }
    }
    setFileNames(Array.from(files).map((f) => f.name));
  };

  const clearFiles = () => {
    if (fileRef.current) fileRef.current.value = '';
    setFileNames([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !secret) return;

    setSubmitting(true);
    try {
      const t = await postThought(
        body,
        secret,
        parentId,
        fileRef.current?.files,
      );
      setText('');
      clearFiles();
      onPosted(t);
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        updateSecret(null);
      } else {
        alert(parentId != null ? 'Failed to post reply' : 'Failed to post thought');
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
      <div className="compose-area">
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
            placeholder={placeholder || "What's on your mind? (markdown supported)"}
            maxLength={1000}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}
      </div>
      <div className="compose-file-row">
        <label className="compose-file-btn" htmlFor={fileInputId}>
          Attach files
        </label>
        <input
          type="file"
          id={fileInputId}
          ref={fileRef}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <span className="compose-file-name">
          {fileNames.join(', ')}
        </span>
        {fileNames.length > 0 && (
          <button
            type="button"
            className="compose-file-clear"
            style={{ display: 'inline' }}
            onClick={clearFiles}
          >
            &times;
          </button>
        )}
      </div>
      <div className="thoughts-form-footer">
        <span className="char-count">{text.length} / 1000</span>
        <button
          type="submit"
          className={parentId != null ? 'reply-submit' : 'thought-submit'}
          disabled={submitting}
        >
          {submitting ? 'Posting...' : label}
        </button>
      </div>
    </form>
  );
}
