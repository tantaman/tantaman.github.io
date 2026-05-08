import type { Route } from '../types';

export function Sidebar({ route }: { route: Route }) {
  return (
    <aside className="thoughts-sidebar">
      <nav className="thoughts-nav">
        <a href="/" className="thoughts-nav-link">Tantaman</a>
        <a href="/thoughts/" className={`thoughts-nav-link${route.view === 'feed' ? ' active' : ''}`} onClick={(e) => {
          e.preventDefault();
          history.pushState(null, '', location.pathname);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }}>Thoughts</a>
        <a href="#media" className={`thoughts-nav-link${route.view === 'media' ? ' active' : ''}`}>Media</a>
        <a href="#framings" className={`thoughts-nav-link${route.view === 'framings' || route.view === 'framing' ? ' active' : ''}`}>Framings</a>
        <a href="#canvases" className={`thoughts-nav-link${route.view === 'canvases' || route.view === 'canvas' ? ' active' : ''}`}>Canvases</a>
        <a href="#documents" className={`thoughts-nav-link${route.view === 'documents' || route.view === 'document' || route.view === 'document-new' ? ' active' : ''}`}>Documents</a>
        <a href="/lists/" className="thoughts-nav-link">Lists</a>
        <a href="/paste" className="thoughts-nav-link">Pastes</a>
        <a href="#graph" className={`thoughts-nav-link${route.view === 'graph' ? ' active' : ''}`}>Graph</a>
        <a href="#browse" className={`thoughts-nav-link${route.view === 'browse' ? ' active' : ''}`}>Browse</a>
        <hr className="thoughts-nav-divider" />
        <a href="#tasks" className={`thoughts-nav-link${route.view === 'tasks' ? ' active' : ''}`}>Tasks <span className="nav-tag-pill">#t</span></a>
        <a href="#questions" className={`thoughts-nav-link${route.view === 'questions' ? ' active' : ''}`}>Questions <span className="nav-tag-pill">#q</span></a>
        <a href="#events" className={`thoughts-nav-link${route.view === 'events' ? ' active' : ''}`}>Events <span className="nav-tag-pill">#e</span></a>
        <a href="#locations" className={`thoughts-nav-link${route.view === 'locations' ? ' active' : ''}`}>Locations <span className="nav-tag-pill">#l</span></a>
        <a href="#books" className={`thoughts-nav-link${route.view === 'books' ? ' active' : ''}`}>Books <span className="nav-tag-pill">#b</span></a>
        <a href="#movies" className={`thoughts-nav-link${route.view === 'movies' ? ' active' : ''}`}>Movies <span className="nav-tag-pill">#m</span></a>
        <a href="#music" className={`thoughts-nav-link${route.view === 'music' ? ' active' : ''}`}>Music <span className="nav-tag-pill">#a</span></a>
        <a href="#bookmarks" className={`thoughts-nav-link${route.view === 'bookmarks' ? ' active' : ''}`}>Bookmarks</a>
        <a href="#amplifications" className={`thoughts-nav-link${route.view === 'amplifications' || route.view === 'capture' ? ' active' : ''}`}>Amplifications</a>
      </nav>
    </aside>
  );
}
