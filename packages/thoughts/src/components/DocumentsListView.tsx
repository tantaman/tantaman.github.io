import { useContext, useState } from 'react';
import { createDocument, deleteDocument } from '../api';
import { AuthContext } from '../App';
import { useDocuments } from '../hooks/useCache';

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DocumentsListView() {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useDocuments(secret);
  const documents = data?.documents ?? [];
  const loading = !data;

  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret || !title.trim()) return;
    setCreating(true);
    try {
      const doc = await createDocument({ title: title.trim() }, secret);
      mutate();
      setTitle('');
      window.location.hash = `document-${doc.id}`;
    } catch {
      // ignore
    }
    setCreating(false);
  };

  const handleDelete = async (id: number) => {
    if (!secret) return;
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    mutate(
      { documents: documents.filter((d) => d.id !== id) },
      false,
    );
    try {
      await deleteDocument(id, secret);
    } catch {
      mutate();
    }
  };

  return (
    <div className="documents-view">
      <h2 className="documents-title">Documents</h2>
      {secret && (
        <form className="documents-create" onSubmit={handleCreate}>
          <input
            type="text"
            className="documents-name-input"
            placeholder="New document title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="submit"
            className="documents-create-btn"
            disabled={creating || !title.trim()}
          >
            Create
          </button>
        </form>
      )}
      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : documents.length === 0 ? (
        <div className="thought-loading">No documents yet</div>
      ) : (
        <ul className="documents-list">
          {documents.map((d) => (
            <li key={d.id} className="documents-item">
              <a href={`#document-${d.id}`} className="documents-item-link">
                <span className="documents-item-name">
                  {d.title}
                  {d.private && <span className="documents-item-badge">private</span>}
                </span>
                <span className="documents-item-meta">
                  Updated {formatDate(d.updated_at)}
                </span>
              </a>
              {secret && (
                <button
                  className="documents-delete-btn"
                  onClick={() => handleDelete(d.id)}
                  title="Delete document"
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
