import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { Route } from './types';
import { getSecret, setSecret } from './auth';
import { SWRProvider } from './swr-config';
import { Layout } from './components/Layout';
import { Feed } from './components/Feed';
import { ThreadView } from './components/ThreadView';
import { TasksView } from './components/TasksView';
import { QuestionsView } from './components/QuestionsView';
import { EventsView } from './components/EventsView';
import { SecretToggle } from './components/SecretToggle';
import { FramingsListView } from './components/FramingsListView';
import { CanvasesListView } from './components/CanvasesListView';
import { DocumentsListView } from './components/DocumentsListView';
import { DocumentEditView } from './components/DocumentEditView';
import { DocumentsSidebar } from './components/DocumentsSidebar';
import { FramingCanvasView } from './components/framing/FramingCanvasView';
const TldrawCanvasView = React.lazy(() => import('./components/TldrawCanvasView').then(m => ({ default: m.TldrawCanvasView })));
import { LocationsView } from './components/LocationsView';
import { MediaView } from './components/MediaView';
import { MoviesView } from './components/MoviesView';
import { BooksView } from './components/BooksView';
import { MusicView } from './components/MusicView';
import { BookmarksView } from './components/BookmarksView';
import { AmplificationsView } from './components/AmplificationsView';
import { CaptureView } from './components/CaptureView';
import { BrowseView } from './components/BrowseView';
import { ThoughtGraph } from './components/ThoughtGraph';

export const AuthContext = createContext<{
  secret: string | null;
  updateSecret: (s: string | null) => void;
}>({ secret: null, updateSecret: () => {} });

function parseHash(): Route {
  const pathMatch = location.pathname.match(/\/thoughts\/t\/(\d+)/);
  if (pathMatch) {
    history.replaceState(null, '', '/thoughts/#thought-' + pathMatch[1]);
    return { view: 'thread', id: parseInt(pathMatch[1], 10) };
  }
  // PWA share target / bookmarklet: ?share_url=...&share_text=...&share_title=...
  // ?as=thought routes to feed with a prefilled compose (markdown link + selection).
  if (location.search) {
    const params = new URLSearchParams(location.search);
    const shareUrl = params.get('share_url') ?? undefined;
    const shareText = params.get('share_text') ?? undefined;
    const shareTitle = params.get('share_title') ?? undefined;
    const as = params.get('as');
    if (shareUrl || shareText || shareTitle) {
      if (as === 'thought') {
        history.replaceState(null, '', '/thoughts/');
        const link = shareUrl
          ? (shareTitle ? `[${shareTitle}](${shareUrl})` : shareUrl)
          : '';
        const note = shareText?.trim();
        const body = [link, note].filter(Boolean).join('\n\n');
        return { view: 'feed', prefill: body };
      }
      history.replaceState(null, '', '/thoughts/#capture');
      return { view: 'capture', url: shareUrl, text: shareText, title: shareTitle };
    }
  }
  const hash = location.hash;
  if (hash === '#documents') return { view: 'documents' };
  if (hash === '#document-new') return { view: 'document-new' };
  const documentMatch = hash.match(/^#document-(\d+)$/);
  if (documentMatch) return { view: 'document', id: parseInt(documentMatch[1], 10) };
  if (hash === '#tasks') return { view: 'tasks' };
  if (hash === '#questions') return { view: 'questions' };
  if (hash === '#events') return { view: 'events' };
  if (hash === '#graph') return { view: 'graph' };
  if (hash === '#framings') return { view: 'framings' };
  if (hash === '#canvases') return { view: 'canvases' };
  const canvasMatch = hash.match(/^#canvas-(\d+)$/);
  if (canvasMatch) return { view: 'canvas', id: parseInt(canvasMatch[1], 10) };
  if (hash === '#locations') return { view: 'locations' };
  if (hash === '#media') return { view: 'media' };
  if (hash === '#movies') return { view: 'movies' };
  if (hash === '#books') return { view: 'books' };
  if (hash === '#music') return { view: 'music' };
  if (hash === '#bookmarks') return { view: 'bookmarks' };
  if (hash === '#amplifications') return { view: 'amplifications' };
  if (hash === '#browse') return { view: 'browse' };
  if (hash === '#capture') return { view: 'capture' };
  const framingMatch = hash.match(/^#framing-(\d+)$/);
  if (framingMatch) return { view: 'framing', id: parseInt(framingMatch[1], 10) };
  const threadMatch = hash.match(/^#thought-(\d+)$/);
  if (threadMatch) return { view: 'thread', id: parseInt(threadMatch[1], 10) };
  return { view: 'feed' };
}

export function App() {
  const [secret, setSecretState] = useState<string | null>(getSecret);
  const [route, setRoute] = useState<Route>(parseHash);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFraming, setSelectedFraming] = useState<number | null>(null);

  const updateSecret = useCallback((s: string | null) => {
    setSecret(s);
    setSecretState(s);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const selectFraming = useCallback((id: number | null) => {
    setSelectedFraming((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);

  return (
    <SWRProvider>
      <AuthContext.Provider value={{ secret, updateSecret }}>
        <Layout route={route} selectedTags={selectedTags} toggleTag={toggleTag} selectedFraming={selectedFraming} selectFraming={selectFraming}>
          {route.view === 'graph' ? (
            <ThoughtGraph />
          ) : route.view === 'documents' ? (
            <DocumentsListView />
          ) : route.view === 'document' ? (
            <>
              <DocumentsSidebar currentId={route.id} />
              <DocumentEditView id={route.id} />
            </>
          ) : route.view === 'document-new' ? (
            <>
              <DocumentsSidebar />
              <DocumentEditView />
            </>
          ) : route.view === 'canvas' ? (
            <React.Suspense fallback={<div className="thought-loading">Loading…</div>}>
              <TldrawCanvasView id={route.id} />
            </React.Suspense>
          ) : route.view === 'framing' ? (
            <FramingCanvasView id={route.id} />
          ) : route.view === 'canvases' ? (
            <CanvasesListView />
          ) : route.view === 'framings' ? (
            <FramingsListView />
          ) : route.view === 'media' ? (
            <MediaView />
          ) : route.view === 'movies' ? (
            <MoviesView />
          ) : route.view === 'bookmarks' ? (
            <BookmarksView />
          ) : route.view === 'amplifications' ? (
            <AmplificationsView />
          ) : route.view === 'capture' ? (
            <CaptureView initialUrl={route.url} initialText={route.text} initialTitle={route.title} />
          ) : route.view === 'browse' ? (
            <BrowseView />
          ) : route.view === 'books' ? (
            <BooksView />
          ) : route.view === 'music' ? (
            <MusicView />
          ) : route.view === 'locations' ? (
            <LocationsView />
          ) : route.view === 'events' ? (
            <EventsView />
          ) : route.view === 'questions' ? (
            <QuestionsView tags={selectedTags} />
          ) : route.view === 'tasks' ? (
            <TasksView tags={selectedTags} />
          ) : route.view === 'thread' ? (
            <ThreadView id={route.id} />
          ) : (
            <Feed
              tags={selectedTags}
              framing={selectedFraming}
              prefill={route.view === 'feed' ? route.prefill : undefined}
            />
          )}
        </Layout>
        <SecretToggle />
      </AuthContext.Provider>
    </SWRProvider>
  );
}
