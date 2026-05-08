import {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { mutate as globalMutate } from 'swr';
import { EditorContent } from '@tiptap/react';
import {
  useMarkdownEditor,
  getMarkdown,
  setMarkdown,
  BubbleToolbar,
  SlashMenu,
  useSlashMenu,
} from '@tantaman/editor';
import { AuthContext } from '../App';
import { useDocument } from '../hooks/useCache';
import { createDocument, updateDocument } from '../api';

interface Props {
  id?: number;
}

const AUTOSAVE_DELAY_MS = 1500;
const API = 'https://tantaman.com/api';

function extractTitle(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

function invalidateDocumentsList() {
  globalMutate('documents-a');
  globalMutate('documents-p');
}

export function DocumentEditView({ id }: Props) {
  const { secret } = useContext(AuthContext);
  const { data: doc, mutate } = useDocument(id ?? -1, secret);
  const isLoaded = id ? !!doc : true;

  const [isPrivate, setIsPrivate] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentId, setCurrentId] = useState<number | undefined>(id);

  const editor = useMarkdownEditor({
    placeholder: ({ node }) =>
      node.type.name === 'heading' && node.attrs?.level === 1
        ? 'Untitled'
        : "Press '/' for commands",
    placeholderShowOnAllEmpty: true,
  });
  const slashMenu = useSlashMenu(editor);
  const initializedRef = useRef(false);

  // Hydrate the editor once we have data (or initialize for a new doc).
  useEffect(() => {
    if (!editor || initializedRef.current) return;
    if (id) {
      if (!doc) return;
      setIsPrivate(!!doc.private);
      setMarkdown(editor, doc.body || '');
      initializedRef.current = true;
    } else {
      editor.commands.setContent({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 } },
          { type: 'paragraph' },
        ],
      });
      editor.commands.focus('start');
      initializedRef.current = true;
    }
  }, [editor, id, doc]);

  // Latest-state ref so unload/unmount handlers see fresh values.
  const stateRef = useRef({
    secret,
    isPrivate,
    currentId,
    editor,
    saveState,
  });
  useEffect(() => {
    stateRef.current = { secret, isPrivate, currentId, editor, saveState };
  });

  // Persist current editor state. Returns the new doc id (if a create happened).
  const persist = useCallback(async (): Promise<number | undefined> => {
    if (!editor || !secret) return;
    if (!initializedRef.current) return;
    const body = getMarkdown(editor);
    const title = extractTitle(body);
    setSaveState('saving');
    try {
      let savedId = currentId;
      if (currentId) {
        const updated = await updateDocument(
          currentId,
          { title, body, private: isPrivate },
          secret,
        );
        mutate(updated, false);
      } else {
        const created = await createDocument(
          { title, body, private: isPrivate },
          secret,
        );
        savedId = created.id;
        setCurrentId(created.id);
        // Replace state so back/forward works; avoid a full hashchange round-trip.
        history.replaceState(null, '', `#document-${created.id}`);
      }
      invalidateDocumentsList();
      setSaveState('saved');
      setErrorMsg('');
      return savedId;
    } catch (e: any) {
      setSaveState('error');
      setErrorMsg(e?.message || 'Save failed');
      return undefined;
    }
  }, [editor, secret, isPrivate, currentId, mutate]);

  // Debounced auto-save when the editor content changes.
  useEffect(() => {
    if (!editor) return;
    let timer: number | null = null;
    const onUpdate = () => {
      if (!initializedRef.current) return;
      setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'));
      if (timer != null) clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        persist();
      }, AUTOSAVE_DELAY_MS);
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      if (timer != null) clearTimeout(timer);
    };
  }, [editor, persist]);

  // Also debounce-trigger when the privacy toggle flips.
  useEffect(() => {
    if (!initializedRef.current) return;
    setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'));
    const t = window.setTimeout(() => persist(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [isPrivate, persist]);

  const handleSave = useCallback(() => {
    persist();
  }, [persist]);

  // Cmd/Ctrl+S — manual flush.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Save-on-close: tab close / external navigation.
  // Uses fetch keepalive so the request can outlive the page.
  useEffect(() => {
    const onBeforeUnload = () => {
      const { secret, isPrivate, currentId, editor, saveState } = stateRef.current;
      if (!editor || !secret || !currentId) return;
      if (saveState !== 'dirty') return;
      const body = getMarkdown(editor);
      const title = extractTitle(body);
      try {
        fetch(`${API}/documents/${currentId}`, {
          method: 'PATCH',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ title, body, private: isPrivate }),
        });
      } catch {
        // best effort
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Save-on-unmount: in-app navigation away from this view.
  useEffect(() => {
    return () => {
      const { secret, editor, saveState, currentId, isPrivate } = stateRef.current;
      if (!editor || !secret || !currentId) return;
      if (saveState !== 'dirty') return;
      const body = getMarkdown(editor);
      const title = extractTitle(body);
      // Fire-and-forget; the page is staying open so the request will complete normally.
      updateDocument(currentId, { title, body, private: isPrivate }, secret)
        .then(() => invalidateDocumentsList())
        .catch(() => {});
    };
  }, []);

  if (!secret) {
    return <div className="thought-loading">Sign in to edit documents.</div>;
  }
  if (id && !isLoaded) {
    return <div className="thought-loading">Loading…</div>;
  }

  let statusLabel = '';
  switch (saveState) {
    case 'dirty': statusLabel = 'Unsaved changes'; break;
    case 'saving': statusLabel = 'Saving…'; break;
    case 'saved': statusLabel = 'Saved'; break;
    case 'error': statusLabel = errorMsg || 'Save failed'; break;
  }

  return (
    <div className="document-edit">
      <div className="document-topbar">
        <div className="document-actions">
          {statusLabel && (
            <span
              className="document-save-status"
              data-state={saveState}
            >
              {statusLabel}
            </span>
          )}
          <label className="document-private-toggle" title="Private">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private
          </label>
          <button
            className="document-save-btn"
            onClick={handleSave}
            disabled={saveState === 'saving'}
          >
            Save
          </button>
        </div>
      </div>

      <div className="md-editor-area document-editor-surface">
        {editor && <BubbleToolbar editor={editor} />}
        <EditorContent editor={editor} />
        <SlashMenu {...slashMenu} />
      </div>
    </div>
  );
}
