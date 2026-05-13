import { useContext, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { createFraming, deleteFraming, importFraming } from '../api';
import { AuthContext } from '../App';
import { useFramings } from '../hooks/useCache';

export function FramingsListView() {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useFramings();
  const framings = data?.framings ?? [];
  const loading = !data;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !secret) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { id } = await importFraming(data, secret);
      navigate({ to: '/framings/$id', params: { id: id } });
    } catch {
      // ignore
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    if (!secret) return;
    if (!window.confirm('Delete this framing? This cannot be undone.')) return;
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
          <button type="button" className="framings-create-btn" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
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
              <Link to="/framings/$id" params={{ id: f.id }} className="framings-item-link">
                <span className="framings-item-name">{f.name}</span>
                {f.description && <span className="framings-item-desc">{f.description}</span>}
              </Link>
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
