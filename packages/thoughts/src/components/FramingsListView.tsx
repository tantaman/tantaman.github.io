import { useContext, useState } from 'react';
import { createFraming, deleteFraming } from '../api';
import { AuthContext } from '../App';
import { useFramings } from '../hooks/useCache';

export function FramingsListView() {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useFramings();
  const framings = data?.framings ?? [];
  const loading = !data;

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret || !name.trim()) return;
    setCreating(true);
    try {
      const framing = await createFraming(name.trim(), secret);
      mutate({ framings: [framing, ...framings] }, false);
      setName('');
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const handleDelete = async (id: number) => {
    if (!secret) return;
    mutate({ framings: framings.filter((f) => f.id !== id) }, false);
    try {
      await deleteFraming(id, secret);
    } catch {
      mutate();
    }
  };

  return (
    <div className="framings-view">
      <h2 className="framings-title">Framings</h2>
      {secret && (
        <form className="framings-create" onSubmit={handleCreate}>
          <input
            type="text"
            className="framings-name-input"
            placeholder="New framing name…"
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
      ) : framings.length === 0 ? (
        <div className="thought-loading">No framings yet</div>
      ) : (
        <ul className="framings-list">
          {framings.map((f) => (
            <li key={f.id} className="framings-item">
              <a href={`#framing-${f.id}`} className="framings-item-link">
                <span className="framings-item-name">{f.name}</span>
                {f.description && <span className="framings-item-desc">{f.description}</span>}
              </a>
              {secret && (
                <button
                  className="framings-delete-btn"
                  onClick={() => handleDelete(f.id)}
                  title="Delete framing"
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
