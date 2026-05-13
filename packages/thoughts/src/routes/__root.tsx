import { useCallback, useEffect, useState } from 'react';
import {
  createRootRoute,
  Outlet,
  redirect,
  useMatches,
  useRouter,
} from '@tanstack/react-router';
import { SWRProvider } from '../swr-config';
import { AuthContext } from '../auth-context';
import { TagsContext } from '../tags-context';
import { Layout } from '../components/Layout';
import { SecretToggle } from '../components/SecretToggle';
import { getSecret, setSecret } from '../auth';
import type { Route as RouteType } from '../types';

function legacyHashRedirect(hash: string): string | null {
  if (!hash || hash === '#') return null;
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const thoughtMatch = h.match(/^thought-(\d+)$/);
  if (thoughtMatch) return `/t/${thoughtMatch[1]}`;
  const framingMatch = h.match(/^framing-(\d+)$/);
  if (framingMatch) return `/framings/${framingMatch[1]}`;
  const canvasMatch = h.match(/^canvas-(\d+)$/);
  if (canvasMatch) return `/canvases/${canvasMatch[1]}`;
  const documentMatch = h.match(/^document-(\d+)$/);
  if (documentMatch) return `/documents/${documentMatch[1]}`;
  if (h === 'document-new') return '/documents/new';
  if (h === 'documents') return '/documents';
  const staticMap: Record<string, string> = {
    tasks: '/tasks',
    questions: '/questions',
    events: '/events',
    graph: '/graph',
    framings: '/framings',
    canvases: '/canvases',
    locations: '/locations',
    media: '/media',
    movies: '/movies',
    books: '/books',
    music: '/music',
    bookmarks: '/bookmarks',
    amplifications: '/amplifications',
    browse: '/browse',
    capture: '/capture',
  };
  return staticMap[h] ?? null;
}

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    const search = location.search as Record<string, unknown>;
    const shareUrl = typeof search.share_url === 'string' ? search.share_url : undefined;
    const shareText = typeof search.share_text === 'string' ? search.share_text : undefined;
    const shareTitle = typeof search.share_title === 'string' ? search.share_title : undefined;
    const as = typeof search.as === 'string' ? search.as : undefined;
    if (shareUrl || shareText || shareTitle) {
      if (as === 'thought') {
        const link = shareUrl
          ? (shareTitle ? `[${shareTitle}](${shareUrl})` : shareUrl)
          : '';
        const note = shareText?.trim();
        const body = [link, note].filter(Boolean).join('\n\n');
        throw redirect({ to: '/', search: { prefill: body }, replace: true });
      }
      throw redirect({
        to: '/capture',
        search: { url: shareUrl, text: shareText, title: shareTitle },
        replace: true,
      });
    }
    const target = legacyHashRedirect(location.hash);
    if (target) throw redirect({ href: target, replace: true });
  },
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();
  const [secret, setSecretState] = useState<string | null>(getSecret);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFraming, setSelectedFraming] = useState<number | null>(null);

  const updateSecret = useCallback((s: string | null) => {
    setSecret(s);
    setSecretState(s);
  }, []);
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);
  const selectFramingFn = useCallback((id: number | null) => {
    setSelectedFraming((prev) => (prev === id ? null : id));
  }, []);

  // Shim: catch in-app `<a href="#xxx">` clicks until Phase 2 rewrites them to <Link>.
  useEffect(() => {
    const onHash = () => {
      const target = legacyHashRedirect(window.location.hash);
      if (target) {
        router.navigate({ to: target, replace: true } as never);
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [router]);

  return (
    <SWRProvider>
      <AuthContext.Provider value={{ secret, updateSecret }}>
        <TagsContext.Provider
          value={{ selectedTags, toggleTag, selectedFraming, selectFraming: selectFramingFn }}
        >
          <RouteShell selectedTags={selectedTags} toggleTag={toggleTag} selectedFraming={selectedFraming} selectFraming={selectFramingFn} />
          <SecretToggle />
        </TagsContext.Provider>
      </AuthContext.Provider>
    </SWRProvider>
  );
}

function RouteShell({
  selectedTags,
  toggleTag,
  selectedFraming,
  selectFraming,
}: {
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedFraming: number | null;
  selectFraming: (id: number | null) => void;
}) {
  const matches = useMatches();
  const deepest = matches[matches.length - 1];
  const staticData = deepest?.staticData as { view?: RouteType['view']; bare?: boolean } | undefined;
  const view = staticData?.view ?? 'feed';
  const bare = staticData?.bare === true;

  // Synthesize a Route value for Layout/Sidebar. They only read .view in Phase 1.
  // Phase 2 step 1 deletes this when Sidebar moves to <Link activeProps>.
  const route = { view } as RouteType;

  if (bare) {
    return (
      <div id="thoughts-page">
        <Outlet />
      </div>
    );
  }
  return (
    <Layout
      route={route}
      selectedTags={selectedTags}
      toggleTag={toggleTag}
      selectedFraming={selectedFraming}
      selectFraming={selectFraming}
    >
      <Outlet />
    </Layout>
  );
}
