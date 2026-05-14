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
  WikiLinkMenu,
  useWikiLinkMenu,
  type WikiLinkSearch,
  type WikiLinkKind,
} from '@tantaman/editor';
import { useNavigate } from '@tanstack/react-router';
import { AuthContext } from '../auth-context';
import { useDocument, useHighlights } from '../hooks/useCache';
import { createDocument, updateDocument, typeahead, postThought, type TypeaheadKindLetter } from '../api';
import type { DocumentStatus, DocumentFrontmatter } from '../types';
import { FramingDetailPane } from './framing/FramingDetailPane';
import { FrontmatterPanel } from './FrontmatterPanel';

const KIND_LETTERS: Record<WikiLinkKind, TypeaheadKindLetter> = {
  doc: 'd',
  thought: 't',
  paste: 'p',
  frame: 'f',
  post: 'b',
};

interface Props {
  id?: number;
}

const AUTOSAVE_DELAY_MS = 1500;
const API = 'https://tantaman.com/api';

function extractTitle(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function invalidateDocumentsList() {
  globalMutate(
    (key: unknown) => typeof key === 'string' && key.startsWith('documents-'),
  );
}

export function DocumentEditView({ id }: Props) {
  const { secret } = useContext(AuthContext);
  const { data: doc, error, mutate } = useDocument(id ?? -1, secret);
  const isLoaded = id ? !!doc : true;

  const [isPrivate, setIsPrivate] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentId, setCurrentId] = useState<number | undefined>(id);
  const [openHighlightId, setOpenHighlightId] = useState<number | null>(null);
  const [status, setStatus] = useState<DocumentStatus>('document');
  const [slug, setSlug] = useState<string>('');
  const [frontmatter, setFrontmatter] = useState<DocumentFrontmatter>({});
  const [showMeta, setShowMeta] = useState(false);
  const slugManuallyEdited = useRef(false);
  const navigate = useNavigate();

  const editor = useMarkdownEditor({
    placeholder: ({ node }) =>
      node.type.name === 'heading' && node.attrs?.level === 1
        ? 'Untitled'
        : "Press '/' for commands",
    onHighlightClick: useCallback((thoughtId: number) => {
      setOpenHighlightId(thoughtId);
    }, []),
  });
  const slashMenu = useSlashMenu(editor);
  const wikiSearch = useCallback<WikiLinkSearch>(
    (kind, query, signal) =>
      typeahead(KIND_LETTERS[kind], query, signal, secret).then((rs) =>
        rs.map((r) => ({ id: r.id, title: r.title, snippet: r.snippet })),
      ),
    [secret],
  );
  const wikiMenu = useWikiLinkMenu(editor, wikiSearch);
  const initializedRef = useRef(false);

  const highlightSource = currentId ? `doc:${currentId}` : null;
  const { data: highlightsData, mutate: mutateHighlights } = useHighlights(
    highlightSource,
    secret,
  );

  // Push highlights into the editor's decoration extension whenever they change
  // or the editor finishes initializing.
  useEffect(() => {
    if (!editor) return;
    editor.commands.setHighlights(highlightsData?.highlights || []);
  }, [editor, highlightsData]);

  const handleHighlight = useCallback(
    async (text: string) => {
      if (!secret || !currentId) return;
      const indented = text.split('\n').map((l) => `> ${l}`).join('\n');
      const body = `${indented}\n\n#h doc:${currentId}`;
      try {
        await postThought(body, secret);
        mutateHighlights();
      } catch {
        // best effort
      }
    },
    [secret, currentId, mutateHighlights],
  );

  // Hydrate the editor once we have data (or initialize for a new doc).
  useEffect(() => {
    if (!editor || initializedRef.current) return;
    if (id) {
      if (!doc) return;
      setIsPrivate(!!doc.private);
      setStatus(doc.status);
      setSlug(doc.slug ?? '');
      setFrontmatter(doc.frontmatter ?? {});
      if (doc.slug) slugManuallyEdited.current = true;
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

  // Auto-generate slug from first H1 when in post mode and not user-edited.
  useEffect(() => {
    if (!editor || status === 'document' || slugManuallyEdited.current) return;
    const handleUpdate = () => {
      if (slugManuallyEdited.current) return;
      const json = editor.getJSON();
      const h1 = (json.content as any[] | undefined)?.find(
        (n: any) => n.type === 'heading' && n.attrs?.level === 1,
      );
      const text = h1?.content?.map((c: any) => c.text || '').join('') || '';
      if (text) {
        const next = slugify(text);
        setSlug((prev) => (prev === next ? prev : next));
      }
    };
    handleUpdate();
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, status]);

  // Read-only when not signed in.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!!secret);
  }, [editor, secret]);

  // Latest-state ref so unload/unmount handlers see fresh values.
  const stateRef = useRef({
    secret,
    isPrivate,
    currentId,
    editor,
    saveState,
    status,
    slug,
    frontmatter,
  });
  useEffect(() => {
    stateRef.current = { secret, isPrivate, currentId, editor, saveState, status, slug, frontmatter };
  });

  // Persist current editor state. Returns the new doc id (if a create happened).
  const persist = useCallback(async (): Promise<number | undefined> => {
    if (!editor || !secret) return;
    if (!initializedRef.current) return;
    const body = getMarkdown(editor);
    const title = extractTitle(body);
    // Only send slug/frontmatter when the doc is a post; for plain documents
    // they're ignored by the server but we still send status so changes stick.
    const isPost = status !== 'document';
    const slugForSave = isPost ? (slug || undefined) : null;
    setSaveState('saving');
    try {
      let savedId = currentId;
      if (currentId) {
        const updated = await updateDocument(
          currentId,
          {
            title,
            body,
            private: isPrivate,
            status,
            slug: slugForSave,
            frontmatter: isPost ? frontmatter : undefined,
          },
          secret,
        );
        mutate(updated, false);
      } else {
        const created = await createDocument(
          {
            title,
            body,
            private: isPrivate,
            status,
            slug: slugForSave || undefined,
            frontmatter: isPost ? frontmatter : undefined,
          },
          secret,
        );
        savedId = created.id;
        setCurrentId(created.id);
        navigate({ to: '/documents/$id', params: { id: created.id }, replace: true });
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
  }, [editor, secret, isPrivate, currentId, status, slug, frontmatter, mutate]);

  // Latest persist closure — read at timer-fire time so we always save fresh state
  // (otherwise toggling the privacy checkbox alone schedules autosave with a stale
  // closure and the PATCH sends the previous value).
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  // Single shared debounce timer — fed by editor edits and the privacy toggle.
  const autosaveTimerRef = useRef<number | null>(null);
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current != null) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      persistRef.current();
    }, AUTOSAVE_DELAY_MS);
  }, []);
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current != null) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const markDirtyAndSchedule = useCallback(() => {
    if (!initializedRef.current) return;
    setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'));
    scheduleAutosave();
  }, [scheduleAutosave]);

  // Editor edits → mark dirty + schedule autosave.
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => markDirtyAndSchedule();
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, markDirtyAndSchedule]);

  const handleSave = useCallback(() => {
    persist();
  }, [persist]);

  const handlePromote = useCallback(() => {
    if (status !== 'document') return;
    setStatus('draft');
    if (!slug && editor) {
      const title = extractTitle(getMarkdown(editor));
      if (title && title !== 'Untitled') setSlug(slugify(title));
    }
    setShowMeta(true);
    markDirtyAndSchedule();
  }, [status, slug, editor, markDirtyAndSchedule]);

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
      const { secret, isPrivate, currentId, editor, saveState, status, slug, frontmatter } = stateRef.current;
      if (!editor || !secret) return;
      if (saveState !== 'dirty') return;
      const body = getMarkdown(editor);
      const title = extractTitle(body);
      const isPost = status !== 'document';
      const payload: Record<string, unknown> = { title, body, private: isPrivate, status };
      if (isPost) {
        payload.slug = slug || null;
        payload.frontmatter = frontmatter;
      } else {
        payload.slug = null;
      }
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      };
      try {
        if (currentId) {
          fetch(`${API}/documents/${currentId}`, {
            method: 'PATCH',
            keepalive: true,
            headers,
            body: JSON.stringify(payload),
          });
        } else {
          fetch(`${API}/documents`, {
            method: 'POST',
            keepalive: true,
            headers,
            body: JSON.stringify(payload),
          });
        }
      } catch {
        // best effort
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Save-on-unmount: in-app navigation away from this view (e.g., switching to another doc).
  useEffect(() => {
    return () => {
      const { secret, editor, saveState, currentId, isPrivate, status, slug, frontmatter } = stateRef.current;
      if (!editor || !secret) return;
      if (saveState !== 'dirty') return;
      const body = getMarkdown(editor);
      const title = extractTitle(body);
      const isPost = status !== 'document';
      const slugForSave = isPost ? (slug || undefined) : null;
      const after = () => invalidateDocumentsList();
      if (currentId) {
        updateDocument(
          currentId,
          {
            title,
            body,
            private: isPrivate,
            status,
            slug: slugForSave,
            frontmatter: isPost ? frontmatter : undefined,
          },
          secret,
        )
          .then(after)
          .catch(() => {});
      } else {
        createDocument(
          {
            title,
            body,
            private: isPrivate,
            status,
            slug: slugForSave || undefined,
            frontmatter: isPost ? frontmatter : undefined,
          },
          secret,
        )
          .then(after)
          .catch(() => {});
      }
    };
  }, []);

  // Creating a new doc requires auth; viewing an existing one does not.
  if (!id && !secret) {
    return <div className="thought-loading">Sign in to create documents.</div>;
  }
  if (id && error) {
    return <div className="thought-loading">Document not found.</div>;
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
      {secret && (
        <div className="document-topbar">
          <span className="doc-status-pill" data-status={status}>
            {status}
          </span>
          {status !== 'document' && (
            <>
              <input
                className="doc-slug-input"
                placeholder="post-slug"
                value={slug}
                onChange={(e) => {
                  slugManuallyEdited.current = true;
                  setSlug(e.target.value);
                  markDirtyAndSchedule();
                }}
              />
              <select
                className="doc-status-pill"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as DocumentStatus);
                  markDirtyAndSchedule();
                }}
                aria-label="Post status"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="document">Document</option>
              </select>
            </>
          )}
          {status === 'document' && (
            <button
              className="doc-promote-btn"
              onClick={handlePromote}
              title="Convert this document into a post"
            >
              Promote to post
            </button>
          )}
          {status !== 'document' && (
            <button
              className="doc-meta-toggle"
              data-active={showMeta}
              onClick={() => setShowMeta((s) => !s)}
            >
              Meta
            </button>
          )}
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
                onChange={(e) => {
                  setIsPrivate(e.target.checked);
                  markDirtyAndSchedule();
                }}
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
      )}

      {secret && status !== 'document' && showMeta && (
        <FrontmatterPanel
          frontmatter={frontmatter}
          onChange={(fm) => {
            setFrontmatter(fm);
            markDirtyAndSchedule();
          }}
        />
      )}

      <div className="document-edit-body">
        <div className="md-editor-area document-editor-surface">
          {editor && secret && (
            <BubbleToolbar
              editor={editor}
              onHighlight={currentId ? handleHighlight : undefined}
            />
          )}
          <EditorContent editor={editor} />
          {secret && <SlashMenu {...slashMenu} />}
          {secret && <WikiLinkMenu {...wikiMenu} />}
        </div>

        {openHighlightId != null && (
          <FramingDetailPane
            key={openHighlightId}
            thoughtId={openHighlightId}
            onClose={() => setOpenHighlightId(null)}
          />
        )}
      </div>
    </div>
  );
}
