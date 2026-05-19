import { useEffect, useState } from 'react';
import { createRootRoute, Outlet, Link, useRouterState } from '@tanstack/react-router';
import { SWRConfig } from 'swr';
import { getSecret, setSecret } from '../auth';

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  });
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('wardrobe-theme', next);
  };
  return (
    <button className="theme-toggle" onClick={toggle}>
      {theme === 'light' ? '◐ light' : '◑ dark'}
    </button>
  );
}

function Masthead() {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const path = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (p: string) => {
    if (p === '/') return path === '/';
    return path === p || path.startsWith(p + '/');
  };

  return (
    <>
      <header className="masthead">
        <div className="masthead__meta">
          <div>Vol. I · No. 1</div>
          <div>An atelier of selection</div>
        </div>
        <Link to="/" className="masthead__title">
          The Wardrobe<span className="amp"> · </span>Atelier
        </Link>
        <div className="masthead__meta masthead__meta--right">
          <div>{today}</div>
          <ThemeToggle />
        </div>
      </header>
      <nav className="masthead__nav">
        <div className="masthead__nav-inner">
          <Link to="/" className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}>Archive</Link>
          <Link to="/wardrobe" className={`nav-link ${isActive('/wardrobe') ? 'nav-link--active' : ''}`}>The Set</Link>
          <Link to="/outfits" className={`nav-link ${isActive('/outfits') ? 'nav-link--active' : ''}`}>Outfits</Link>
          <Link to="/bracket" className={`nav-link ${isActive('/bracket') ? 'nav-link--active' : ''}`}>Eliminations</Link>
          <Link to="/new" className={`nav-link ${isActive('/new') ? 'nav-link--active' : ''}`}>Acquire</Link>
          <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'nav-link--active' : ''}`}>Settings</Link>
        </div>
      </nav>
    </>
  );
}

function AuthBootstrap() {
  // Accept ?secret=... once on first load (e.g., when arriving from a share link).
  useEffect(() => {
    if (getSecret()) return;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('secret');
    if (fromUrl) {
      setSecret(fromUrl);
      url.searchParams.delete('secret');
      window.history.replaceState(null, '', url.toString());
    }
  }, []);
  return null;
}

function RootLayout() {
  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateIfStale: true }}>
      <AuthBootstrap />
      <Masthead />
      <Outlet />
    </SWRConfig>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
