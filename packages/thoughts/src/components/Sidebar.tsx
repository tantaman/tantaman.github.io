import { useEffect, useState } from 'react';
import type { Route } from '../types';

export function Sidebar({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [route]);

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

  const closeOnNav = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="thoughts-nav-toggle"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`thoughts-nav-toggle-icon${open ? ' open' : ''}`}>
          <span /><span /><span />
        </span>
      </button>
      {open && <div className="thoughts-nav-backdrop" onClick={closeOnNav} />}
      <aside className={`thoughts-sidebar${open ? ' open' : ''}`}>
        <nav className="thoughts-nav">
          <a href="/" className="thoughts-nav-link">Tantaman</a>
          <a href="/thoughts/" className={`thoughts-nav-link${route.view === 'feed' ? ' active' : ''}`} onClick={(e) => {
            e.preventDefault();
            history.pushState(null, '', location.pathname);
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            closeOnNav();
          }}>Thoughts</a>
          <a href="#media" className={`thoughts-nav-link${route.view === 'media' ? ' active' : ''}`} onClick={closeOnNav}>Media</a>
          <a href="#framings" className={`thoughts-nav-link${route.view === 'framings' || route.view === 'framing' ? ' active' : ''}`} onClick={closeOnNav}>Framings</a>
          <a href="#canvases" className={`thoughts-nav-link${route.view === 'canvases' || route.view === 'canvas' ? ' active' : ''}`} onClick={closeOnNav}>Canvases</a>
          <a href="#documents" className={`thoughts-nav-link${route.view === 'documents' || route.view === 'document' || route.view === 'document-new' ? ' active' : ''}`} onClick={closeOnNav}>Documents</a>
          <a href="/lists/" className="thoughts-nav-link">Lists</a>
          <a href="/paste" className="thoughts-nav-link">Pastes</a>
          <a href="#graph" className={`thoughts-nav-link${route.view === 'graph' ? ' active' : ''}`} onClick={closeOnNav}>Graph</a>
          <a href="#browse" className={`thoughts-nav-link${route.view === 'browse' ? ' active' : ''}`} onClick={closeOnNav}>Browse</a>
          <hr className="thoughts-nav-divider" />
          <a href="#tasks" className={`thoughts-nav-link${route.view === 'tasks' ? ' active' : ''}`} onClick={closeOnNav}>Tasks <span className="nav-tag-pill">#t</span></a>
          <a href="#questions" className={`thoughts-nav-link${route.view === 'questions' ? ' active' : ''}`} onClick={closeOnNav}>Questions <span className="nav-tag-pill">#q</span></a>
          <a href="#events" className={`thoughts-nav-link${route.view === 'events' ? ' active' : ''}`} onClick={closeOnNav}>Events <span className="nav-tag-pill">#e</span></a>
          <a href="#locations" className={`thoughts-nav-link${route.view === 'locations' ? ' active' : ''}`} onClick={closeOnNav}>Locations <span className="nav-tag-pill">#l</span></a>
          <a href="#books" className={`thoughts-nav-link${route.view === 'books' ? ' active' : ''}`} onClick={closeOnNav}>Books <span className="nav-tag-pill">#b</span></a>
          <a href="#movies" className={`thoughts-nav-link${route.view === 'movies' ? ' active' : ''}`} onClick={closeOnNav}>Movies <span className="nav-tag-pill">#m</span></a>
          <a href="#music" className={`thoughts-nav-link${route.view === 'music' ? ' active' : ''}`} onClick={closeOnNav}>Music <span className="nav-tag-pill">#a</span></a>
          <a href="#bookmarks" className={`thoughts-nav-link${route.view === 'bookmarks' ? ' active' : ''}`} onClick={closeOnNav}>Bookmarks</a>
          <a href="#amplifications" className={`thoughts-nav-link${route.view === 'amplifications' || route.view === 'capture' ? ' active' : ''}`} onClick={closeOnNav}>Amplifications</a>
        </nav>
      </aside>
    </>
  );
}
