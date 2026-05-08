import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
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
import { AuthContext } from '../../App';
import {
  getDocument,
  updateDocument,
  typeahead,
  type TypeaheadKindLetter,
} from '../../api';

const KIND_LETTERS: Record<WikiLinkKind, TypeaheadKindLetter> = {
  doc: 'd',
  thought: 't',
  paste: 'p',
  frame: 'f',
  post: 'b',
};

const AUTOSAVE_DELAY_MS = 1500;

function extractTitle(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

function previewBody(body: string, max = 200): string {
  const trimmed = body.replace(/^#\s+.*$/m, '').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max) + '…';
}

export type DocumentNodeData = {
  nodeId: number;
  documentId: number;
  title: string;
  body: string;
  updatedAt: number;
  private: boolean;
  onRemove?: (nodeId: number) => void;
};

export type DocumentNodeType = Node<DocumentNodeData, 'document'>;

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export const DocumentNode = memo(function DocumentNode({
  data,
}: NodeProps<DocumentNodeType>) {
  const { secret } = useContext(AuthContext);
  const [expanded, setExpanded] = useState(false);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [bodyOverride, setBodyOverride] = useState<string | null>(null);

  const title = titleOverride ?? data.title;
  const body = bodyOverride ?? data.body ?? '';
  const preview = previewBody(body);

  const openFullView = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.hash = `#document-${data.documentId}`;
    },
    [data.documentId],
  );

  // The browser navigates by default when a drop lands on or near an <a> with
  // an in-page href (drop-on-link). ReactFlow's onDrop doesn't always intercept
  // those events, so guard the node wrapper itself.
  const swallowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className={`framing-document-node${expanded ? ' expanded' : ''}`}
      onDragOver={swallowDrop}
      onDrop={swallowDrop}
    >
      <div className="framing-document-node-header">
        <a
          href={`#document-${data.documentId}`}
          className="framing-document-node-title"
          title="Open in full view"
          draggable={false}
          onClick={openFullView}
          onDragStart={(e) => e.preventDefault()}
        >
          {title || 'Untitled'}
          {data.private && (
            <span className="framing-document-node-private" title="Private">·</span>
          )}
        </a>
        <div className="framing-document-node-actions">
          <button
            className="framing-document-node-toggle"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse' : 'Expand to edit'}
          >
            {expanded ? '⤢' : '⤡'}
          </button>
          {secret && data.onRemove && (
            <button
              className="framing-node-remove"
              onClick={() => data.onRemove!(data.nodeId)}
              title="Remove from framing"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {expanded ? (
        <DocumentNodeEditor
          documentId={data.documentId}
          initialBody={body}
          isPrivate={data.private}
          secret={secret}
          onTitleChange={setTitleOverride}
          onBodyChange={setBodyOverride}
        />
      ) : (
        preview && <div className="framing-document-node-summary">{preview}</div>
      )}

      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />
    </div>
  );
});

function DocumentNodeEditor({
  documentId,
  initialBody,
  isPrivate,
  secret,
  onTitleChange,
  onBodyChange,
}: {
  documentId: number;
  initialBody: string;
  isPrivate: boolean;
  secret: string | null;
  onTitleChange: (title: string) => void;
  onBodyChange: (body: string) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const editor = useMarkdownEditor({
    placeholder: ({ node }: { node: { type: { name: string }; attrs?: { level?: number } } }) =>
      node.type.name === 'heading' && node.attrs?.level === 1
        ? 'Untitled'
        : "Press '/' for commands",
  });
  const slashMenu = useSlashMenu(editor);
  const wikiSearch = useCallback<WikiLinkSearch>(
    (kind, query, signal) =>
      typeahead(KIND_LETTERS[kind], query, signal, secret ?? undefined).then((rs) =>
        rs.map((r) => ({ id: r.id, title: r.title, snippet: r.snippet })),
      ),
    [secret],
  );
  const wikiMenu = useWikiLinkMenu(editor, wikiSearch);

  const initializedRef = useRef(false);

  // Fetch fresh body on mount, then hydrate the editor.
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let bodyToLoad = initialBody;
      try {
        const fresh = await getDocument(documentId, secret ?? undefined);
        if (cancelled) return;
        bodyToLoad = fresh.body || '';
      } catch {
        // fall back to initialBody
      }
      if (cancelled) return;
      setMarkdown(editor, bodyToLoad);
      onBodyChange(bodyToLoad);
      onTitleChange(extractTitle(bodyToLoad));
      setLoading(false);
      initializedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, documentId]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!!secret);
  }, [editor, secret]);

  const stateRef = useRef({ secret, isPrivate, editor, saveState });
  useEffect(() => {
    stateRef.current = { secret, isPrivate, editor, saveState };
  });

  const persist = useCallback(async () => {
    if (!editor || !secret) return;
    if (!initializedRef.current) return;
    const body = getMarkdown(editor);
    const title = extractTitle(body);
    setSaveState('saving');
    try {
      await updateDocument(documentId, { title, body }, secret);
      onTitleChange(title);
      onBodyChange(body);
      setSaveState('saved');
      setErrorMsg('');
    } catch (e: any) {
      setSaveState('error');
      setErrorMsg(e?.message || 'Save failed');
    }
  }, [editor, secret, documentId, onTitleChange, onBodyChange]);

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

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

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => markDirtyAndSchedule();
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, markDirtyAndSchedule]);

  // Save on collapse/unmount.
  useEffect(() => {
    return () => {
      const { secret, editor } = stateRef.current;
      if (!editor || !secret) return;
      if (!initializedRef.current) return;
      const body = getMarkdown(editor);
      const title = extractTitle(body);
      updateDocument(documentId, { title, body }, secret).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Keep ReactFlow from acting on key events while typing.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  let statusLabel = '';
  switch (saveState) {
    case 'dirty': statusLabel = 'Unsaved'; break;
    case 'saving': statusLabel = 'Saving…'; break;
    case 'saved': statusLabel = 'Saved'; break;
    case 'error': statusLabel = errorMsg || 'Save failed'; break;
  }

  return (
    <div
      className="framing-doc-editor nodrag nowheel"
      onKeyDown={onKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {statusLabel && (
        <div className="framing-doc-editor-status" data-state={saveState}>
          {statusLabel}
        </div>
      )}
      <div className="framing-doc-editor-surface">
        {loading && <div className="framing-doc-editor-loading">Loading…</div>}
        {editor && secret && <BubbleToolbar editor={editor} />}
        <EditorContent editor={editor} />
        {secret && <SlashMenu {...slashMenu} />}
        {secret && <WikiLinkMenu {...wikiMenu} />}
      </div>
    </div>
  );
}
