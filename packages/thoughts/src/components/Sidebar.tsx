import type { Route } from '../types';

export function Sidebar({ route }: { route: Route }) {
  return (
    <aside className="thoughts-sidebar">
      <nav className="thoughts-nav">
        <a href="/thoughts/" className={`thoughts-nav-link${route.view === 'feed' ? ' active' : ''}`} onClick={(e) => {
          e.preventDefault();
          history.pushState(null, '', location.pathname);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }}>Home</a>
        <a href="#tasks" className={`thoughts-nav-link${route.view === 'tasks' ? ' active' : ''}`}>Tasks</a>
        <a href="#events" className={`thoughts-nav-link${route.view === 'events' ? ' active' : ''}`}>Events</a>
        <a href="/thoughts/locations" className="thoughts-nav-link">Locations</a>
      </nav>
    </aside>
  );
}
