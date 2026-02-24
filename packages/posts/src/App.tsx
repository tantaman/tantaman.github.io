import { createContext, useState, useCallback, useEffect } from 'react';
import { getSecret, setSecret } from './auth';
import { SecretToggle } from './SecretToggle';
import { PostList } from './PostList';
import { Editor } from './Editor';
import type { Route } from './types';

export const AuthContext = createContext<{
  secret: string | null;
  updateSecret: (s: string | null) => void;
}>({ secret: null, updateSecret: () => {} });

function parseRoute(): Route {
  const hash = location.hash.slice(1);
  if (hash === 'new') return { view: 'new' };
  const editMatch = hash.match(/^edit-(\d+)$/);
  if (editMatch) return { view: 'edit', id: Number(editMatch[1]) };
  return { view: 'list' };
}

export function App() {
  const [secret, setSecretState] = useState(getSecret);
  const [route, setRoute] = useState<Route>(parseRoute);

  const updateSecret = useCallback((s: string | null) => {
    setSecret(s);
    setSecretState(s);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!secret) {
    return (
      <div className="pe-auth-gate">
        <h2>Posts Editor</h2>
        <p>Enter your secret to continue.</p>
        <SecretToggle inline />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ secret, updateSecret }}>
      {route.view === 'list' && <PostList />}
      {route.view === 'new' && <Editor />}
      {route.view === 'edit' && <Editor postId={route.id} />}
      <SecretToggle />
    </AuthContext.Provider>
  );
}
