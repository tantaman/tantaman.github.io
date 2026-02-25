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
        <a href="#tasks" className={`thoughts-nav-link${route.view === 'tasks' ? ' active' : ''}`}>Tasks</a>
        <a href="#events" className={`thoughts-nav-link${route.view === 'events' ? ' active' : ''}`}>Events</a>
        <a href="#media" className={`thoughts-nav-link${route.view === 'media' ? ' active' : ''}`}>Media</a>
        <a href="#framings" className={`thoughts-nav-link${route.view === 'framings' ? ' active' : ''}`}>Framings</a>
        <a href="#locations" className={`thoughts-nav-link${route.view === 'locations' ? ' active' : ''}`}>Locations</a>
      </nav>
    </aside>
  );
}
