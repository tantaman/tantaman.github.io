import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { SWRConfig } from 'swr';
import type { Route, List, ListItem as ListItemType } from './types';
import { getSecret, setSecret } from './auth';
import * as api from './api';
import useSWR from 'swr';
import { SecretToggle } from './components/SecretToggle';
import { ListCard } from './components/ListCard';
import { ListItem } from './components/ListItem';

export const AuthContext = createContext<{
  secret: string | null;
  updateSecret: (s: string | null) => void;
}>({ secret: null, updateSecret: () => {} });

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
  errorRetryCount: 2,
};

// SWR bundles @types/react@18 which conflicts with @types/react@19.
const Config = SWRConfig as any;

function parseHash(): Route {
  const match = location.hash.match(/^#list-(\d+)$/);
  if (match) return { view: 'list', id: parseInt(match[1], 10) };
  return { view: 'dashboard' };
}

// --- Dashboard ---

function Dashboard({ secret }: { secret: string }) {
  const { data: lists, mutate } = useSWR('lists', () => api.getLists(secret));
  const [newName, setNewName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const created = await api.createList(name, secret);
    setNewName('');
    mutate((prev: List[] | undefined) => prev ? [created, ...prev] : [created], false);
  };

  const handleDelete = async (id: number) => {
    await api.deleteList(id, secret);
    mutate((prev: List[] | undefined) => prev?.filter((l: List) => l.id !== id), false);
  };

  return (
    <>
      <form className="list-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New list..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={!newName.trim()}>Create</button>
      </form>
      <div className="list-grid">
        {lists?.map((list) => (
          <ListCard key={list.id} list={list} onDelete={handleDelete} />
        ))}
        {lists && lists.length === 0 && (
          <p className="list-empty">No lists yet. Create one above.</p>
        )}
      </div>
    </>
  );
}

// --- List View ---

function ListView({ id, secret }: { id: number; secret: string }) {
  const { data, mutate } = useSWR(`list-${id}`, () => api.getList(id, secret));
  const [newItem, setNewItem] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const list = data?.list;
  const items = data?.items ?? [];

  const visibleItems = hideCompleted ? items.filter((i) => i.completed !== 1) : items;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    const created = await api.createItem(id, text, secret);
    setNewItem('');
    mutate(
      (prev: any) => prev ? { ...prev, items: [...prev.items, created] } : prev,
      false,
    );
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggle = async (item: ListItemType) => {
    const newCompleted = item.completed === 1 ? false : true;
    mutate(
      (prev: any) => prev ? {
        ...prev,
        items: prev.items.map((i: ListItemType) =>
          i.id === item.id ? { ...i, completed: newCompleted ? 1 : 0 } : i
        ),
      } : prev,
      false,
    );
    await api.updateItem(id, item.id, { completed: newCompleted }, secret);
  };

  const handleDeleteItem = async (item: ListItemType) => {
    mutate(
      (prev: any) => prev ? {
        ...prev,
        items: prev.items.filter((i: ListItemType) => i.id !== item.id),
      } : prev,
      false,
    );
    await api.deleteItem(id, item.id, secret);
  };

  const handleNameSave = async () => {
    const trimmed = nameValue.trim();
    if (trimmed && list && trimmed !== list.name) {
      await api.updateList(id, trimmed, secret);
      mutate();
    }
    setEditingName(false);
  };

  const handleDeleteList = async () => {
    if (list && confirm(`Delete "${list.name}"?`)) {
      await api.deleteList(id, secret);
      location.hash = '';
    }
  };

  const completedCount = items.filter((i) => i.completed === 1).length;

  if (!list) return null;

  return (
    <>
      <div className="list-view-header">
        <a href="#" className="list-back">&larr; Lists</a>
        <div className="list-view-actions">
          <button className="list-delete-btn" onClick={handleDeleteList}>Delete list</button>
        </div>
      </div>

      {editingName ? (
        <input
          className="list-name-edit"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameSave();
            if (e.key === 'Escape') setEditingName(false);
          }}
          autoFocus
        />
      ) : (
        <h2
          className="list-name"
          onClick={() => { setNameValue(list.name); setEditingName(true); }}
          title="Click to edit"
        >
          {list.name}
        </h2>
      )}

      {items.length > 0 && (
        <div className="list-view-meta">
          <span>{completedCount}/{items.length} done</span>
          <label className="list-hide-toggle">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            Hide completed
          </label>
        </div>
      )}

      <div className="list-items">
        {visibleItems.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            onToggle={handleToggle}
            onDelete={handleDeleteItem}
          />
        ))}
      </div>

      <form className="list-add-item" onSubmit={handleAddItem}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Add item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          autoFocus
        />
      </form>
    </>
  );
}

// --- App Shell ---

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

  return (
    <AuthContext.Provider value={{ secret, updateSecret }}>
      <Config value={swrOptions}>
        <div id="lists-page">
          <header className="lists-header">
            <a href="/" className="lists-home">Tantamanlands</a>
            <h1>Lists</h1>
          </header>
          <main className="lists-main">
            {!secret ? (
              <p className="list-empty">Enter your secret to access lists.</p>
            ) : route.view === 'dashboard' ? (
              <Dashboard secret={secret} />
            ) : (
              <ListView id={route.id} secret={secret} />
            )}
          </main>
          <SecretToggle />
        </div>
      </Config>
    </AuthContext.Provider>
  );
}
