import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import type { Editor } from '@tiptap/core';
import type { WikiLinkKind } from './WikiLink';

export interface WikiLinkResult {
  id: string;
  title: string;
  snippet?: string;
}

export type WikiLinkSearch = (
  kind: WikiLinkKind,
  query: string,
  signal: AbortSignal,
) => Promise<WikiLinkResult[]>;

type Mode = 'pick' | 'search';

interface KindOption {
  kind: WikiLinkKind;
  letter: string;
  label: string;
}

const KIND_OPTIONS: KindOption[] = [
  { kind: 'doc',     letter: 'd', label: 'Document'  },
  { kind: 'thought', letter: 't', label: 'Thought'   },
  { kind: 'paste',   letter: 'p', label: 'Paste'     },
  { kind: 'frame',   letter: 'f', label: 'Frame'     },
  { kind: 'post',    letter: 'b', label: 'Blog Post' },
];

function letterToKind(letter: string): WikiLinkKind | null {
  switch (letter) {
    case 'd': return 'doc';
    case 't': return 'thought';
    case 'p': return 'paste';
    case 'f': return 'frame';
    case 'b': return 'post';
    default: return null;
  }
}

function kindToLetter(kind: WikiLinkKind): string {
  switch (kind) {
    case 'doc': return 'd';
    case 'thought': return 't';
    case 'paste': return 'p';
    case 'frame': return 'f';
    case 'post': return 'b';
  }
}

interface TriggerState {
  from: number; // pos of first `[`
  to: number;   // current caret pos
  mode: Mode;
  kind: WikiLinkKind | null;
  query: string;
}

function detectTrigger(editor: Editor): TriggerState | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const { $from, from } = selection;
  // Skip inside code blocks / inline code.
  if (editor.isActive('codeBlock') || editor.isActive('code')) return null;

  const blockText = $from.parent.textContent;
  const offset = $from.parentOffset;
  const before = blockText.slice(0, offset);

  const openIdx = before.lastIndexOf('[[');
  if (openIdx === -1) return null;
  const inside = before.slice(openIdx + 2);
  if (inside.includes(']') || inside.includes('\n') || inside.includes('[')) return null;

  const triggerFrom = from - inside.length - 2;

  const searchMatch = inside.match(/^([dtpfb]) (.*)$/);
  if (searchMatch) {
    const kind = letterToKind(searchMatch[1]);
    if (!kind) return null;
    return { from: triggerFrom, to: from, mode: 'search', kind, query: searchMatch[2] };
  }
  if (/^[a-zA-Z]*$/.test(inside)) {
    return { from: triggerFrom, to: from, mode: 'pick', kind: null, query: inside.toLowerCase() };
  }
  return null;
}

export function useWikiLinkMenu(
  editor: Editor | null,
  search: WikiLinkSearch | null,
) {
  const [trigger, setTrigger] = useState<TriggerState | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [results, setResults] = useState<WikiLinkResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const open = trigger !== null;

  const filteredKinds = trigger?.mode === 'pick'
    ? (
        trigger.query
          ? KIND_OPTIONS.filter((k) =>
              k.label.toLowerCase().startsWith(trigger.query) || k.letter === trigger.query
            )
          : KIND_OPTIONS
      )
    : [];

  const itemCount = trigger?.mode === 'pick'
    ? filteredKinds.length
    : results.length;

  const close = useCallback(() => {
    setTrigger(null);
    setResults([]);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  const selectKind = useCallback((kind: WikiLinkKind) => {
    if (!editor || !trigger) return;
    const letter = kindToLetter(kind);
    editor
      .chain()
      .focus()
      .insertContentAt({ from: trigger.from, to: trigger.to }, `[[${letter} `)
      .run();
  }, [editor, trigger]);

  const selectResult = useCallback((res: WikiLinkResult) => {
    if (!editor || !trigger || !trigger.kind) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: trigger.from, to: trigger.to })
      .insertContentAt(trigger.from, {
        type: 'wikiLink',
        attrs: { kind: trigger.kind, targetId: res.id, label: res.title || null },
      })
      .run();
    close();
  }, [editor, trigger, close]);

  // Re-detect trigger on every editor change.
  useEffect(() => {
    if (!editor) return;
    const handle = () => {
      const t = detectTrigger(editor);
      if (!t) {
        setTrigger((prev) => (prev ? null : prev));
        return;
      }
      const coords = editor.view.coordsAtPos(t.from);
      setPosition({ top: coords.bottom + 4, left: coords.left });
      setTrigger((prev) => {
        if (!prev || prev.mode !== t.mode || prev.kind !== t.kind || prev.query !== t.query) {
          setSelectedIndex(0);
        }
        return t;
      });
    };
    editor.on('update', handle);
    editor.on('selectionUpdate', handle);
    return () => {
      editor.off('update', handle);
      editor.off('selectionUpdate', handle);
    };
  }, [editor]);

  // Debounced fetch in search mode.
  useEffect(() => {
    if (!open || trigger?.mode !== 'search' || !search || !trigger.kind) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const k = trigger.kind;
    const q = trigger.query;
    setLoading(true);
    const t = setTimeout(() => {
      search(k, q, ctrl.signal)
        .then((rs) => {
          if (ctrl.signal.aborted) return;
          setResults(rs);
          setLoading(false);
          setSelectedIndex(0);
        })
        .catch((err) => {
          if (err && (err as { name?: string }).name === 'AbortError') return;
          setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, trigger?.mode, trigger?.kind, trigger?.query, search]);

  // Keyboard navigation.
  useEffect(() => {
    if (!editor || !open) return;
    const handler = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        close();
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowDown') {
        if (itemCount === 0) return;
        setSelectedIndex((i) => (i + 1) % itemCount);
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowUp') {
        if (itemCount === 0) return;
        setSelectedIndex((i) => (i - 1 + itemCount) % itemCount);
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (trigger?.mode === 'pick') {
          const item = filteredKinds[selectedIndex];
          if (item) {
            selectKind(item.kind);
            event.preventDefault();
          }
        } else if (trigger?.mode === 'search') {
          const r = results[selectedIndex];
          if (r) {
            selectResult(r);
            event.preventDefault();
          }
        }
        return;
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [editor, open, trigger, filteredKinds, results, selectedIndex, selectKind, selectResult, close, itemCount]);

  return {
    open,
    mode: (trigger?.mode ?? 'pick') as Mode,
    kind: trigger?.kind ?? null,
    query: trigger?.query ?? '',
    position,
    filteredKinds,
    results,
    selectedIndex,
    loading,
    selectKind,
    selectResult,
  };
}

export interface WikiLinkMenuProps {
  open: boolean;
  mode: Mode;
  kind: WikiLinkKind | null;
  query: string;
  position: { top: number; left: number };
  filteredKinds: KindOption[];
  results: WikiLinkResult[];
  selectedIndex: number;
  loading: boolean;
  selectKind: (kind: WikiLinkKind) => void;
  selectResult: (res: WikiLinkResult) => void;
}

export function WikiLinkMenu(props: WikiLinkMenuProps) {
  const {
    open, mode, kind, query, position,
    filteredKinds, results, selectedIndex, loading,
    selectKind, selectResult,
  } = props;
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current;
    el.style.top = `${position.top}px`;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${position.top - rect.height - 24}px`;
    }
  }, [open, position]);

  if (!open) return null;

  const kindLabel = kind
    ? KIND_OPTIONS.find((k) => k.kind === kind)?.label ?? kind
    : null;
  const currentLetter = kind ? kindToLetter(kind) : '';

  return (
    <div
      ref={menuRef}
      className="md-wikilink-menu"
      style={{ position: 'fixed', top: position.top, left: position.left }}
    >
      <div className="md-wikilink-header">
        {mode === 'pick' && <span>Link to…</span>}
        {mode === 'search' && (
          <span>
            {kindLabel}
            {query && <span className="md-wikilink-query"> "{query}"</span>}
            {loading && <span className="md-wikilink-loading"> …</span>}
          </span>
        )}
      </div>
      {mode === 'pick' && (
        filteredKinds.length === 0 ? (
          <div className="md-wikilink-empty">No match</div>
        ) : (
          filteredKinds.map((opt, i) => (
            <button
              key={opt.kind}
              className={i === selectedIndex ? 'is-selected' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                selectKind(opt.kind);
              }}
            >
              <span className="md-wikilink-icon" data-kind={opt.kind}>{opt.letter}</span>
              <span className="md-wikilink-label">{opt.label}</span>
            </button>
          ))
        )
      )}
      {mode === 'search' && (
        results.length === 0 ? (
          <div className="md-wikilink-empty">{loading ? 'Searching…' : 'No matches'}</div>
        ) : (
          results.map((r, i) => (
            <button
              key={`${kind}-${r.id}`}
              className={i === selectedIndex ? 'is-selected' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                selectResult(r);
              }}
            >
              <span className="md-wikilink-icon" data-kind={kind ?? undefined}>{currentLetter}</span>
              <span className="md-wikilink-label">
                <span className="md-wikilink-title">{r.title || '(untitled)'}</span>
                {r.snippet && <span className="md-wikilink-snippet">{r.snippet}</span>}
              </span>
            </button>
          ))
        )
      )}
    </div>
  );
}
