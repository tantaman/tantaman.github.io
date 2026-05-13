import { useContext } from 'react';
import { Link } from '@tanstack/react-router';
import { deleteDocument } from '../api';
import { AuthContext } from '../auth-context';
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
      <div className="documents-header">
        <h2 className="documents-title">Documents</h2>
        {secret && (
          <Link to="/documents/new" className="documents-new-btn">
            + New
          </Link>
        )}
      </div>
      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : documents.length === 0 ? (
        <div className="thought-loading">No documents yet</div>
      ) : (
        <ul className="documents-list">
          {documents.map((d) => (
            <li key={d.id} className="documents-item">
              <Link to="/documents/$id" params={{ id: d.id }} className="documents-item-link">
                <span className="documents-item-name">
                  {d.title}
                  {d.private && <span className="documents-item-badge">private</span>}
                </span>
                <span className="documents-item-meta">
                  Updated {formatDate(d.updated_at)}
                </span>
              </Link>
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
