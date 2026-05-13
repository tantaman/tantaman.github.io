import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';

export function ThoughtDuplicatesPopover({ ids }: { ids: number[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  if (ids.length === 0) return null;

  return (
    <span className="thought-dupes" ref={wrapRef}>
      <button
        type="button"
        className="thought-dupes-badge"
        aria-label={`${ids.length} identical ${ids.length === 1 ? 'thought' : 'thoughts'}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        &equiv; {ids.length}
      </button>
      {open && (
        <div className="thought-dupes-popover" role="dialog">
          <div className="thought-dupes-popover-title">
            Identical {ids.length === 1 ? 'thought' : 'thoughts'}
          </div>
          <ul className="thought-dupes-list">
            {ids.map((id) => (
              <li key={id}>
                <Link
                  to="/t/$id"
                  params={{ id: id }}
                  onClick={() => setOpen(false)}
                >
                  #{id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
