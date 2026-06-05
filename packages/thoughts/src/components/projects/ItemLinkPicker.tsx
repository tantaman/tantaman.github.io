import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { typeahead } from '../../api';
import type { TypeaheadKindLetter, TypeaheadResult } from '../../api';
import { AuthContext } from '../../auth-context';
import type { ProjectItemType } from '../../types';

// The item kinds linkable via the `@` verb, in tab order. Bookmarks are not here
// — those are captured by pasting a URL (a separate command-bar verb).
const KINDS: { type: ProjectItemType; letter: TypeaheadKindLetter; label: string }[] = [
  { type: 'document', letter: 'd', label: 'Docs' },
  { type: 'thought', letter: 't', label: 'Thoughts' },
  { type: 'post', letter: 'b', label: 'Posts' },
  { type: 'framing', letter: 'f', label: 'Framings' },
  { type: 'paste', letter: 'p', label: 'Pastes' },
];

// A searchable picker for linking an existing item to a project. Mirrors the doc
// editor's `@` mention flow (pick a kind, then search), but standalone — it calls
// the same `/typeahead` endpoint rather than wiring TipTap's suggestion plugin.
export function ItemLinkPicker({
  initialQuery = '',
  onPick,
  onCancel,
}: {
  initialQuery?: string;
  onPick: (itemType: ProjectItemType, itemId: string, title: string) => void;
  onCancel: () => void;
}) {
  const { secret } = useContext(AuthContext);
  const [kind, setKind] = useState<ProjectItemType>('document');
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<TypeaheadResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const letter = useMemo(() => KINDS.find((k) => k.type === kind)!.letter, [kind]);

  // Debounced search whenever the kind or query changes.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const handle = setTimeout(() => {
      typeahead(letter, q.trim(), ctrl.signal, secret)
        .then((rs) => {
          if (ctrl.signal.aborted) return;
          setResults(rs);
          setHi(0);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 150);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [letter, q, secret]);

  const pick = (r: TypeaheadResult) => onPick(kind, r.id, r.title);

  return (
    <div className="project-item-picker">
      <div className="project-item-picker-kinds">
        {KINDS.map((k) => (
          <button
            key={k.type}
            type="button"
            className={`project-item-kind${k.type === kind ? ' active' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); setKind(k.type); inputRef.current?.focus(); }}
          >
            {k.label}
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        className="task-add-input project-combobox-input"
        placeholder="Search to link…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setTimeout(onCancel, 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const r = results[hi];
            if (r) pick(r);
          }
        }}
      />
      {loading && results.length === 0 ? (
        <div className="project-item-picker-empty">Searching…</div>
      ) : results.length === 0 ? (
        <div className="project-item-picker-empty">No matches.</div>
      ) : (
        <ul className="project-combobox-list">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className={`project-combobox-option${i === hi ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                onMouseEnter={() => setHi(i)}
              >
                <span className="project-item-opt-title">{r.title}</span>
                {r.snippet && <span className="project-item-opt-snippet">{r.snippet}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
