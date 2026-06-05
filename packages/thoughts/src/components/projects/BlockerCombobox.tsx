import { useEffect, useMemo, useState } from 'react';
import type { ProjectTask } from '../../types';

// A searchable replacement for the old hidden <select> blocker picker: type to
// filter, arrow keys to move, Enter to pick, Escape (or blur) to cancel.
export function BlockerCombobox({
  options,
  onPick,
  onCancel,
}: {
  options: ProjectTask[];
  onPick: (taskId: number) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? options.filter((o) => o.title.toLowerCase().includes(s)) : options;
    return list.slice(0, 8);
  }, [q, options]);

  useEffect(() => {
    setHi(0);
  }, [q]);

  return (
    <div className="project-blocker-combobox">
      <input
        autoFocus
        type="text"
        className="task-add-input project-combobox-input"
        placeholder="Blocked by… (type to search)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // Delay so an option's onMouseDown can fire before we cancel.
        onBlur={() => setTimeout(onCancel, 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const pick = filtered[hi];
            if (pick) onPick(pick.id);
          }
        }}
      />
      {filtered.length > 0 && (
        <ul className="project-combobox-list">
          {filtered.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                className={`project-combobox-option${i === hi ? ' active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(o.id);
                }}
                onMouseEnter={() => setHi(i)}
              >
                {o.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
