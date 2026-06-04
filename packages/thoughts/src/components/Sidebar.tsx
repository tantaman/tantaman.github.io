import { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

const ACTIVE = { className: 'thoughts-nav-link active' };
const INACTIVE = { className: 'thoughts-nav-link' };

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const ampActive = pathname.startsWith('/amplifications') || pathname.startsWith('/capture');

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
      {open && <div className="thoughts-nav-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`thoughts-sidebar${open ? ' open' : ''}`}>
        <nav className="thoughts-nav">
          <a href="/" className="thoughts-nav-link">Tantaman</a>
          <Link to="/" activeOptions={{ exact: true }} activeProps={ACTIVE} inactiveProps={INACTIVE}>Thoughts</Link>
          <Link to="/media" activeProps={ACTIVE} inactiveProps={INACTIVE}>Media</Link>
          <Link to="/framings" activeOptions={{ exact: false }} activeProps={ACTIVE} inactiveProps={INACTIVE}>Framings</Link>
          <Link to="/documents" activeOptions={{ exact: false }} activeProps={ACTIVE} inactiveProps={INACTIVE}>Documents</Link>
          <a href="/lists/" className="thoughts-nav-link">Lists</a>
          <a href="/paste" className="thoughts-nav-link">Pastes</a>
          <Link to="/graph" activeProps={ACTIVE} inactiveProps={INACTIVE}>Graph</Link>
          <hr className="thoughts-nav-divider" />
          <Link to="/projects" activeOptions={{ exact: false }} activeProps={ACTIVE} inactiveProps={INACTIVE}>Projects <span className="nav-tag-pill">#p</span></Link>
          <Link to="/tasks" activeProps={ACTIVE} inactiveProps={INACTIVE}>Tasks <span className="nav-tag-pill">#t</span></Link>
          <Link to="/questions" activeProps={ACTIVE} inactiveProps={INACTIVE}>Questions <span className="nav-tag-pill">#q</span></Link>
          <Link to="/events" activeProps={ACTIVE} inactiveProps={INACTIVE}>Events <span className="nav-tag-pill">#e</span></Link>
          <Link to="/locations" activeProps={ACTIVE} inactiveProps={INACTIVE}>Locations <span className="nav-tag-pill">#l</span></Link>
          <Link to="/books" activeProps={ACTIVE} inactiveProps={INACTIVE}>Books <span className="nav-tag-pill">#b</span></Link>
          <Link to="/movies" activeProps={ACTIVE} inactiveProps={INACTIVE}>Movies <span className="nav-tag-pill">#m</span></Link>
          <Link to="/music" activeProps={ACTIVE} inactiveProps={INACTIVE}>Music <span className="nav-tag-pill">#a</span></Link>
          <Link to="/bookmarks" activeProps={ACTIVE} inactiveProps={INACTIVE}>Bookmarks</Link>
          <Link to="/amplifications" className={`thoughts-nav-link${ampActive ? ' active' : ''}`}>Amplifications</Link>
        </nav>
      </aside>
    </>
  );
}
