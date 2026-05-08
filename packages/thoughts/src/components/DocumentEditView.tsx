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

function extractTitle(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function DocumentEditView({ id }: Props) {
  const { secret } = useContext(AuthContext);
  const { data: doc, mutate } = useDocument(id ?? -1, secret);
  const isLoaded = id ? !!doc : true;

  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [currentId, setCurrentId] = useState<number | undefined>(id);
  const [dirty, setDirty] = useState(false);

  const editor = useMarkdownEditor({
    placeholder: ({ node }) =>
      node.type.name === 'heading' && node.attrs?.level === 1
        ? 'Untitled'
        : "Press '/' for commands",
    placeholderShowOnAllEmpty: true,
  });
  const slashMenu = useSlashMenu(editor);
  const initializedRef = useRef(false);

  // Hydrate editor + form fields when an existing document loads.
  // For new documents, prefill an empty H1 + paragraph and focus the title.
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

  // Track dirtiness for save-state hint.
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setDirty(true);
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor]);

  const handleSave = useCallback(async () => {
    if (!editor || !secret) return;
    const body = getMarkdown(editor);
    const title = extractTitle(body);
    setSaving(true);
    setSaveMsg('');
    try {
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
        setCurrentId(created.id);
        location.hash = `document-${created.id}`;
      }
      setDirty(false);
      setSaveMsg('Saved');
    } catch (e: any) {
      setSaveMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }, [editor, secret, isPrivate, currentId, mutate]);

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

  const statusLabel = saving ? 'Saving…' : saveMsg ? saveMsg : dirty ? 'Unsaved' : '';

  return (
    <div className="document-edit">
      <div className="document-topbar">
        <a href="#documents" className="document-topbar-back">← Documents</a>
        <div className="document-actions">
          {statusLabel && <span className="document-save-status">{statusLabel}</span>}
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
