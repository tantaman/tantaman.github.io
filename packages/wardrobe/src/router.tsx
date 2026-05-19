import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
}

function parseHash(): Route {
  const raw = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v = ''] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return { path: pathPart, params: {}, query, hash: raw };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return route;
}

export function navigate(path: string): void {
  if (window.location.hash === `#${path}`) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = path;
}

export function matchRoute(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.replace(/^\/+|\/+$/g, '').split('/');
  const patternParts = pattern.replace(/^\/+|\/+$/g, '').split('/');
  if (pathParts.length !== patternParts.length) {
    if (!(path === '/' && pattern === '/')) return null;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const ap = pathParts[i] ?? '';
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(ap);
    } else if (pp !== ap) {
      return null;
    }
  }
  return params;
}

export function Link({
  to,
  children,
  className,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        if (onClick) onClick();
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
