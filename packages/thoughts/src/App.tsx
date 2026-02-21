import { createContext, useCallback, useEffect, useState } from 'react';
import type { Route } from './types';
import { getSecret, setSecret } from './auth';
import { SWRProvider } from './swr-config';
import { Layout } from './components/Layout';
import { Feed } from './components/Feed';
import { ThreadView } from './components/ThreadView';
import { TasksView } from './components/TasksView';
import { EventsView } from './components/EventsView';
import { SecretToggle } from './components/SecretToggle';

export const AuthContext = createContext<{
  secret: string | null;
  updateSecret: (s: string | null) => void;
}>({ secret: null, updateSecret: () => {} });

function parseHash(): Route {
  const hash = location.hash;
  if (hash === '#tasks') return { view: 'tasks' };
  if (hash === '#events') return { view: 'events' };
  const threadMatch = hash.match(/^#thought-(\d+)$/);
  if (threadMatch) return { view: 'thread', id: parseInt(threadMatch[1], 10) };
  return { view: 'feed' };
}

export function App() {
  const [secret, setSecretState] = useState<string | null>(getSecret);
  const [route, setRoute] = useState<Route>(parseHash);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const updateSecret = useCallback((s: string | null) => {
    setSecret(s);
    setSecretState(s);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    // Navigate to feed view so the tag filter is visible
    if (location.hash) {
      history.pushState(null, '', location.pathname);
      setRoute({ view: 'feed' });
    }
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <SWRProvider>
      <AuthContext.Provider value={{ secret, updateSecret }}>
        <Layout route={route} selectedTags={selectedTags} toggleTag={toggleTag}>
          {route.view === 'events' ? (
            <EventsView />
          ) : route.view === 'tasks' ? (
            <TasksView tags={selectedTags} />
          ) : route.view === 'thread' ? (
            <ThreadView id={route.id} onTagClick={toggleTag} />
          ) : (
            <Feed tags={selectedTags} onTagClick={toggleTag} />
          )}
        </Layout>
        <SecretToggle />
      </AuthContext.Provider>
    </SWRProvider>
  );
}
