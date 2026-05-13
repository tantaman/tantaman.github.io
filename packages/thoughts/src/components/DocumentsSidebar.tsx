import { useContext, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthContext } from '../App';
import { useDocuments } from '../hooks/useCache';

export function DocumentsSidebar({ currentId }: { currentId?: number }) {
  const { secret } = useContext(AuthContext);
  const { data } = useDocuments(secret);
  const documents = data?.documents ?? [];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [currentId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('thoughts-nav-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('thoughts-nav-open');
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="document-sidebar-toggle"
        aria-label={open ? 'Close documents list' : 'Open documents list'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`thoughts-nav-toggle-icon${open ? ' open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>
      {open && <div className="thoughts-nav-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`document-sidebar${open ? ' open' : ''}`}>
        <div className="document-sidebar-header">
          <Link to="/" className="document-sidebar-home" title="Back to Thoughts">⌂</Link>
          <Link to="/documents" className="document-sidebar-title">Documents</Link>
          <Link to="/documents/new" className="document-sidebar-new" title="New document">+</Link>
        </div>
        <nav className="document-sidebar-list">
          {documents.length === 0 ? (
            <span className="document-sidebar-empty">No documents</span>
          ) : (
            documents.map((d) => (
              <Link
                key={d.id}
                to="/documents/$id"
                params={{ id: d.id }}
                className={`document-sidebar-item${d.id === currentId ? ' active' : ''}`}
                title={d.title}
                onClick={() => setOpen(false)}
              >
                <span className="document-sidebar-item-name">
                  {d.title || 'Untitled'}
                </span>
                {d.private && <span className="document-sidebar-item-badge">·</span>}
              </Link>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}
