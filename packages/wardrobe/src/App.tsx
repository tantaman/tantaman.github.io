import { useEffect, useState } from 'react';
import { SWRConfig } from 'swr';
import { useRoute, navigate, Link, matchRoute } from './router';
import { Gallery } from './components/Gallery';
import { ItemDetail } from './components/ItemDetail';
import { AddItem } from './components/AddItem';
import { CompareView } from './components/CompareView';
import { BracketView } from './components/BracketView';
import { WardrobeView } from './components/WardrobeView';
import { Settings } from './components/Settings';
import { getSecret, setSecret } from './auth';

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
  const route = useRoute();
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isActive = (p: string) => {
    if (p === '/' && route.path === '/') return true;
    if (p !== '/' && route.path.startsWith(p)) return true;
    return false;
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
          <Link to="/" className={`nav-link ${isActive('/') ? 'nav-link--active' : ''}`}>
            Archive
          </Link>
          <Link to="/wardrobe" className={`nav-link ${isActive('/wardrobe') ? 'nav-link--active' : ''}`}>
            The Set
          </Link>
          <Link to="/bracket" className={`nav-link ${isActive('/bracket') ? 'nav-link--active' : ''}`}>
            Eliminations
          </Link>
          <Link to="/new" className={`nav-link ${isActive('/new') ? 'nav-link--active' : ''}`}>
            Acquire
          </Link>
          <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'nav-link--active' : ''}`}>
            Settings
          </Link>
        </div>
      </nav>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [secret, setSecretState] = useState<string | null>(() => getSecret());

  useEffect(() => {
    if (!secret) {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get('secret');
      if (fromUrl) {
        setSecret(fromUrl);
        setSecretState(fromUrl);
        url.searchParams.delete('secret');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [secret]);

  return <>{children}</>;
}

function RouteView() {
  const route = useRoute();

  const itemMatch = matchRoute(route.path, '/item/:id');
  if (itemMatch) {
    return <ItemDetail id={Number(itemMatch.id)} />;
  }
  if (route.path === '/new') return <AddItem />;
  if (route.path === '/compare') return <CompareView idsParam={route.query.ids ?? ''} />;
  if (route.path === '/bracket') return <BracketView />;
  if (route.path === '/wardrobe') return <WardrobeView />;
  if (route.path === '/settings') return <Settings />;
  return <Gallery />;
}

export function App() {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateIfStale: true,
      }}
    >
      <AuthGate>
        <Masthead />
        <RouteView />
      </AuthGate>
    </SWRConfig>
  );
}
