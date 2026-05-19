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
  parseMarkdownToDoc,
  getCollabVersion,
  getSendableSteps,
  receiveSteps,
  BubbleToolbar,
  TableMenu,
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
import {
  createDocument,
  updateDocument,
  typeahead,
  postThought,
  getDocument,
  collabBootstrap,
  collabSeed,
  collabPullSteps,
  collabSubmitSteps,
  collabPushSnapshot,
  CollabStaleError,
  CollabConflictError,
  type TypeaheadKindLetter,
} from '../api';
import type { DocumentStatus, DocumentFrontmatter, CollabStepEntry } from '../types';
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

const METADATA_AUTOSAVE_MS = 1500;
const STEP_FLUSH_DEBOUNCE_MS = 300;
const POLL_INTERVAL_MS = 3000;

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

function newClientID(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function DocumentEditView({ id }: Props) {
  const { secret } = useContext(AuthContext);
  const [currentId, setCurrentId] = useState<number | undefined>(id);
  const { data: doc, error } = useDocument(currentId ?? -1, secret);
  const navigate = useNavigate();

  // --- Metadata state (kept on the regular PATCH path — last write wins) ---
  const [isPrivate, setIsPrivate] = useState(false);
  const [status, setStatus] = useState<DocumentStatus>('document');
  const [slug, setSlug] = useState<string>('');
  const [frontmatter, setFrontmatter] = useState<DocumentFrontmatter>({});
  const [showMeta, setShowMeta] = useState(false);
  const slugManuallyEdited = useRef(false);
  const metadataHydratedRef = useRef(false);

  // --- Collab state ---
  const [collabConfig, setCollabConfig] = useState<{ version: number; clientID: number } | null>(null);
  const [initialContent, setInitialContent] = useState<unknown>(null);
  const [pendingBootstrapSteps, setPendingBootstrapSteps] = useState<CollabStepEntry[] | null>(null);
  const [phase, setPhase] = useState<'init' | 'creating' | 'ready' | 'stale' | 'error'>('init');
  const [errorMsg, setErrorMsg] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [openHighlightId, setOpenHighlightId] = useState<number | null>(null);

  const editor = useMarkdownEditor({
    placeholder: ({ node }) =>
      node.type.name === 'heading' && node.attrs?.level === 1
        ? 'Untitled'
        : "Press '/' for commands",
    onHighlightClick: useCallback((thoughtId: number) => {
      setOpenHighlightId(thoughtId);
    }, []),
    collab: collabConfig ?? undefined,
    content: initialContent ?? undefined,
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

  const highlightSource = currentId ? `doc:${currentId}` : null;
  const { data: highlightsData, mutate: mutateHighlights } = useHighlights(
    highlightSource,
    secret,
  );

  // Highlights → decorations.
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

  // --- Create-on-mount when no id ----------------------------------------
  useEffect(() => {
    if (currentId || phase !== 'init') return;
    if (!secret) return;
    setPhase('creating');
    (async () => {
      try {
        const created = await createDocument(
          { title: 'Untitled', body: '', status: 'document' },
          secret,
        );
        setCurrentId(created.id);
        navigate({ to: '/documents/$id', params: { id: created.id }, replace: true });
        // Bootstrap effect will fire once currentId updates.
        setPhase('init');
      } catch (e: any) {
        setErrorMsg(e?.message || 'Create failed');
        setPhase('error');
      }
    })();
  }, [currentId, secret, phase, navigate]);

  // --- Bootstrap (or seed) the collab room -------------------------------
  useEffect(() => {
    if (!currentId) return;
    if (collabConfig !== null) return; // already bootstrapped
    if (phase === 'creating') return;
    let cancelled = false;
    (async () => {
      try {
        const bs = await collabBootstrap(currentId, secret);
        if (cancelled) return;
        if (bs.initialized) {
          setPendingBootstrapSteps(bs.steps);
          setInitialContent(bs.snapshot.doc);
          setCollabConfig({ version: bs.snapshot.version, clientID: newClientID() });
          setPhase('ready');
          return;
        }
        // Not initialized — seed from current D1 markdown body.
        if (!secret) {
          setErrorMsg('Sign in to view this document');
          setPhase('error');
          return;
        }
        const fresh = doc ?? (await getDocument(currentId, secret));
        if (cancelled) return;
        const markdown = fresh.body || '';
        const docJson = markdown
          ? parseMarkdownToDoc(markdown)
          : {
              type: 'doc',
              content: [
                { type: 'heading', attrs: { level: 1 } },
                { type: 'paragraph' },
              ],
            };
        const title = extractTitle(markdown);
        await collabSeed(currentId, { doc: docJson, body: markdown, title }, secret);
        if (cancelled) return;
        setInitialContent(docJson);
        setCollabConfig({ version: 0, clientID: newClientID() });
        setPendingBootstrapSteps([]);
        setPhase('ready');
      } catch (e: any) {
        if (cancelled) return;
        if (e instanceof CollabStaleError) {
          setPhase('stale');
        } else {
          setErrorMsg(e?.message || 'Bootstrap failed');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentId, secret, collabConfig, phase, doc]);

  // Apply bootstrap steps once the editor has been re-mounted with the
  // matching collab config.
  useEffect(() => {
    if (!editor || !pendingBootstrapSteps || pendingBootstrapSteps.length === 0) {
      if (pendingBootstrapSteps && pendingBootstrapSteps.length === 0) {
        setPendingBootstrapSteps(null);
      }
      return;
    }
    receiveSteps(
      editor,
      pendingBootstrapSteps.map((s) => s.step),
      pendingBootstrapSteps.map((s) => s.clientID),
    );
    setPendingBootstrapSteps(null);
  }, [editor, pendingBootstrapSteps]);

  // Metadata hydration from SWR.
  useEffect(() => {
    if (!doc || metadataHydratedRef.current) return;
    setIsPrivate(!!doc.private);
    setStatus(doc.status);
    setSlug(doc.slug ?? '');
    setFrontmatter(doc.frontmatter ?? {});
    if (doc.slug) slugManuallyEdited.current = true;
    metadataHydratedRef.current = true;
  }, [doc]);

  // Editable iff signed in.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!!secret);
  }, [editor, secret]);

  // Slug autogen from H1.
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

  // --- Step flush loop ---------------------------------------------------
  const submittingRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current != null) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushRef.current();
    }, STEP_FLUSH_DEBOUNCE_MS);
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (!editor || !secret || !currentId || !collabConfig) return;
    if (submittingRef.current) return;
    const sendable = getSendableSteps(editor);
    if (!sendable) return;
    submittingRef.current = true;
    setSaveState('saving');
    try {
      const result = await collabSubmitSteps(
        currentId,
        {
          baseVersion: sendable.version,
          steps: sendable.steps as unknown[],
          clientID: sendable.clientID,
        },
        secret,
      );
      // Echo our own steps back into the local collab plugin so it advances
      // its confirmed version pointer past them — unless the polling loop
      // already pulled them in (in which case confirmed has moved past
      // sendable.version and re-applying would double-advance the version).
      if (getCollabVersion(editor) === sendable.version) {
        receiveSteps(
          editor,
          sendable.steps as unknown[],
          sendable.steps.map(() => sendable.clientID),
        );
      }
      setSaveState('saved');
      setErrorMsg('');
      if (result.shouldSnapshot) {
        const md = getMarkdown(editor);
        collabPushSnapshot(
          currentId,
          {
            version: getCollabVersion(editor),
            doc: editor.getJSON(),
            body: md,
            title: extractTitle(md),
          },
          secret,
        )
          .then(() => invalidateDocumentsList())
          .catch(() => {});
      }
    } catch (e: any) {
      if (e instanceof CollabConflictError) {
        if (e.missed.steps.length === 0) {
          // Server demanded a snapshot or returned an opaque conflict — easiest
          // to restart from the latest snapshot.
          setPhase('stale');
        } else {
          receiveSteps(
            editor,
            e.missed.steps.map((s) => s.step),
            e.missed.steps.map((s) => s.clientID),
          );
          setSaveState('dirty');
        }
      } else if (e instanceof CollabStaleError) {
        setPhase('stale');
      } else {
        setSaveState('error');
        setErrorMsg(e?.message || 'Save failed');
      }
    } finally {
      submittingRef.current = false;
      if (editor && getSendableSteps(editor)) {
        scheduleFlush();
      }
    }
  }, [editor, secret, currentId, collabConfig, scheduleFlush]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  // Editor updates → mark dirty + schedule flush.
  useEffect(() => {
    if (!editor || !collabConfig) return;
    const onUpdate = () => {
      if (!getSendableSteps(editor)) return;
      setSaveState((prev) => (prev === 'saving' ? prev : 'dirty'));
      scheduleFlush();
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, collabConfig, scheduleFlush]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current != null) clearTimeout(flushTimerRef.current);
    };
  }, []);

  // --- Polling for remote steps -----------------------------------------
  useEffect(() => {
    if (!editor || !currentId || !collabConfig || phase !== 'ready') return;
    let active = true;
    const tick = async () => {
      if (!active) return;
      try {
        const since = getCollabVersion(editor);
        const result = await collabPullSteps(currentId, since, secret);
        if (!active) return;
        // Filter out anything we've already received (e.g. a submit's echo
        // arrived between when this poll was issued and when it resolved).
        const localVersion = getCollabVersion(editor);
        const newSteps = result.steps.filter((s) => s.version > localVersion);
        if (newSteps.length > 0) {
          receiveSteps(
            editor,
            newSteps.map((s) => s.step),
            newSteps.map((s) => s.clientID),
          );
          if (getSendableSteps(editor)) scheduleFlush();
        }
      } catch (e) {
        if (e instanceof CollabStaleError) {
          setPhase('stale');
        }
        // Other errors: swallow, retry next tick.
      }
    };
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [editor, currentId, collabConfig, phase, secret, scheduleFlush]);

  // --- Metadata PATCH (separate from collab) ----------------------------
  const metadataTimerRef = useRef<number | null>(null);

  const persistMetadata = useCallback(async (): Promise<void> => {
    if (!secret || !currentId) return;
    const isPost = status !== 'document';
    try {
      await updateDocument(
        currentId,
        {
          private: isPrivate,
          status,
          slug: isPost ? (slug || undefined) : null,
          frontmatter: isPost ? frontmatter : undefined,
        },
        secret,
      );
      invalidateDocumentsList();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Save failed');
    }
  }, [secret, currentId, isPrivate, status, slug, frontmatter]);

  const metadataRef = useRef(persistMetadata);
  useEffect(() => {
    metadataRef.current = persistMetadata;
  });

  const scheduleMetadata = useCallback(() => {
    if (metadataTimerRef.current != null) clearTimeout(metadataTimerRef.current);
    metadataTimerRef.current = window.setTimeout(() => {
      metadataTimerRef.current = null;
      metadataRef.current();
    }, METADATA_AUTOSAVE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (metadataTimerRef.current != null) clearTimeout(metadataTimerRef.current);
    };
  }, []);

  // --- Save-on-unmount: flush sendable steps via keepalive --------------
  const stateRef = useRef({ secret, currentId, editor, collabConfig });
  useEffect(() => {
    stateRef.current = { secret, currentId, editor, collabConfig };
  });

  const keepaliveFlushSteps = useCallback(() => {
    const { secret, currentId, editor, collabConfig } = stateRef.current;
    if (!editor || !secret || !currentId || !collabConfig) return;
    const sendable = getSendableSteps(editor);
    if (!sendable) return;
    try {
      fetch(`https://tantaman.com/api/documents/${currentId}/collab/steps`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          baseVersion: sendable.version,
          steps: sendable.steps,
          clientID: sendable.clientID,
        }),
      });
    } catch {
      // best effort
    }
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => keepaliveFlushSteps();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [keepaliveFlushSteps]);

  useEffect(() => {
    return () => {
      keepaliveFlushSteps();
    };
  }, [keepaliveFlushSteps]);

  // Cmd/Ctrl+S — force-flush.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        flushRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handlePromote = useCallback(() => {
    if (status !== 'document') return;
    setStatus('draft');
    if (!slug && editor) {
      const title = extractTitle(getMarkdown(editor));
      if (title && title !== 'Untitled') setSlug(slugify(title));
    }
    setShowMeta(true);
    scheduleMetadata();
  }, [status, slug, editor, scheduleMetadata]);

  const handleReload = useCallback(() => {
    // Clear collab state and re-bootstrap.
    setCollabConfig(null);
    setInitialContent(null);
    setPendingBootstrapSteps(null);
    setPhase('init');
    setSaveState('idle');
    setErrorMsg('');
    metadataHydratedRef.current = false;
  }, []);

  // --- Render -----------------------------------------------------------
  if (!currentId && !secret) {
    return <div className="thought-loading">Sign in to create documents.</div>;
  }
  if (currentId && error) {
    return <div className="thought-loading">Document not found.</div>;
  }
  if (phase === 'init' || phase === 'creating' || !editor || collabConfig === null) {
    return <div className="thought-loading">Loading…</div>;
  }
  if (phase === 'error') {
    return <div className="thought-loading">Error: {errorMsg || 'unknown'}</div>;
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
      {phase === 'stale' && (
        <div className="document-stale-banner" role="alert">
          This document was updated from another device beyond what we can
          reconcile here. Reload to continue.
          <button onClick={handleReload}>Reload</button>
        </div>
      )}
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
                  scheduleMetadata();
                }}
              />
              <select
                className="doc-status-pill"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as DocumentStatus);
                  scheduleMetadata();
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
                  scheduleMetadata();
                }}
              />
              Private
            </label>
            <button
              className="document-save-btn"
              onClick={() => flushRef.current()}
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
            scheduleMetadata();
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
          {editor && secret && <TableMenu editor={editor} />}
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
