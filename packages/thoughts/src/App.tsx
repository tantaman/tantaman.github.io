import { createContext, useCallback, useEffect, useState } from 'react';
import type { Route } from './types';
import { getSecret, setSecret } from './auth';
import { Layout } from './components/Layout';
import { Feed } from './components/Feed';
import { ThreadView } from './components/ThreadView';
import { TasksView } from './components/TasksView';
import { SecretToggle } from './components/SecretToggle';

export const AuthContext = createContext<{
  secret: string | null;
  updateSecret: (s: string | null) => void;
}>({ secret: null, updateSecret: () => {} });

function parseHash(): Route {
  const hash = location.hash;
  if (hash === '#tasks') return { view: 'tasks' };
  const threadMatch = hash.match(/^#thought-(\d+)$/);
  if (threadMatch) return { view: 'thread', id: parseInt(threadMatch[1], 10) };
  const tagMatch = hash.match(/^#tag-(.+)$/);
  if (tagMatch) return { view: 'tag', tag: decodeURIComponent(tagMatch[1]) };
  return { view: 'feed' };
}

export function App() {
  const [secret, setSecretState] = useState<string | null>(getSecret);
  const [route, setRoute] = useState<Route>(parseHash);

  const updateSecret = useCallback((s: string | null) => {
    setSecret(s);
    setSecretState(s);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigateToFeed = useCallback(() => {
    history.pushState(null, '', location.pathname);
    setRoute({ view: 'feed' });
  }, []);

  return (
    <AuthContext.Provider value={{ secret, updateSecret }}>
      <Layout route={route}>
        {route.view === 'tasks' ? (
          <TasksView />
        ) : route.view === 'thread' ? (
          <ThreadView id={route.id} onBack={navigateToFeed} />
        ) : (
          <Feed
            tag={route.view === 'tag' ? route.tag : undefined}
            onBack={navigateToFeed}
          />
        )}
      </Layout>
      <SecretToggle />
    </AuthContext.Provider>
  );
}
