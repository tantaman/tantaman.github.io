import { useContext, useState } from 'react';
import { createCanvas, deleteCanvas } from '../api';
import { AuthContext } from '../App';
import { useCanvases } from '../hooks/useCache';

export function CanvasesListView() {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useCanvases();
  const canvases = data?.canvases ?? [];
  const loading = !data;

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret || !name.trim()) return;
    setCreating(true);
    try {
      const canvas = await createCanvas(name.trim(), secret);
      mutate({ canvases: [canvas, ...canvases] }, false);
      setName('');
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const handleDelete = async (id: number) => {
    if (!secret) return;
    if (!window.confirm('Delete this canvas? This cannot be undone.')) return;
    mutate({ canvases: canvases.filter((c) => c.id !== id) }, false);
    try {
      await deleteCanvas(id, secret);
    } catch {
      mutate();
    }
  };

  return (
    <div className="framings-view">
      <h2 className="framings-title">Canvases</h2>
      {secret && (
        <form className="framings-create" onSubmit={handleCreate}>
          <input
            type="text"
            className="framings-name-input"
            placeholder="New canvas name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="framings-create-btn" disabled={creating || !name.trim()}>
            Create
          </button>
        </form>
      )}
      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : canvases.length === 0 ? (
        <div className="thought-loading">No canvases yet</div>
      ) : (
        <ul className="framings-list">
          {canvases.map((c) => (
            <li key={c.id} className="framings-item">
              <a href={`#canvas-${c.id}`} className="framings-item-link">
                <span className="framings-item-name">{c.name}</span>
              </a>
              {secret && (
                <button
                  className="framings-delete-btn"
                  onClick={() => handleDelete(c.id)}
                  title="Delete canvas"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
