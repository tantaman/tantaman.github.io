import {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
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

export function DocumentEditView({ id }: Props) {
  const { secret } = useContext(AuthContext);
  const { data: doc, mutate } = useDocument(id ?? -1, secret);
  const isLoaded = id ? !!doc : true;

  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [currentId, setCurrentId] = useState<number | undefined>(id);

  const editor = useMarkdownEditor({ placeholder: 'Start writing… (type / for commands)' });
  const slashMenu = useSlashMenu(editor);
  const loadedRef = useRef(false);

  // Hydrate editor + form fields when an existing document loads.
  useEffect(() => {
    if (!editor || !id || loadedRef.current) return;
    if (!doc) return;
    setTitle(doc.title);
    setIsPrivate(!!doc.private);
    setMarkdown(editor, doc.body || '');
    loadedRef.current = true;
  }, [editor, id, doc]);

  const handleSave = useCallback(async () => {
    if (!editor || !secret) return;
    const body = getMarkdown(editor);
    const finalTitle = title.trim() || 'Untitled';
    setSaving(true);
    setSaveMsg('');
    try {
      if (currentId) {
        const updated = await updateDocument(
          currentId,
          { title: finalTitle, body, private: isPrivate },
          secret,
        );
        mutate(updated, false);
        setSaveMsg('Saved');
      } else {
        const created = await createDocument(
          { title: finalTitle, body, private: isPrivate },
          secret,
        );
        setCurrentId(created.id);
        location.hash = `document-${created.id}`;
        setSaveMsg('Created');
      }
    } catch (e: any) {
      setSaveMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }, [editor, secret, title, isPrivate, currentId, mutate]);

  // Cmd/Ctrl+S
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

  if (!secret) {
    return <div className="thought-loading">Sign in to edit documents.</div>;
  }
  if (id && !isLoaded) {
    return <div className="thought-loading">Loading…</div>;
  }

  return (
    <div className="document-edit">
      <div className="document-topbar">
        <a href="#documents" className="document-topbar-back">← Documents</a>
        <input
          className="document-title-input"
          placeholder="Untitled document"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
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
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saveMsg && <span className="document-save-status">{saveMsg}</span>}
      </div>

      <div className="md-editor-area document-editor-surface">
        {editor && <BubbleToolbar editor={editor} />}
        <EditorContent editor={editor} />
        <SlashMenu {...slashMenu} />
      </div>
    </div>
  );
}
