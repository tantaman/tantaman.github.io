import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { deleteDocument } from '../api';
import { AuthContext } from '../auth-context';
import { useDocuments } from '../hooks/useCache';
import type { DocumentStatus } from '../types';

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type Filter = 'all' | DocumentStatus;

export function DocumentsListView() {
  const { secret } = useContext(AuthContext);
  const [filter, setFilter] = useState<Filter>('all');
  const { data, mutate } = useDocuments(
    secret,
    filter === 'all' ? undefined : filter,
  );
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
        <div className="documents-filter" role="tablist">
          {(['all', 'document', 'draft', 'published'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className="documents-filter-btn"
              data-active={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
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
                  {d.status !== 'document' && (
                    <span className="doc-status-pill" data-status={d.status}>
                      {d.status}
                    </span>
                  )}
                  {d.private && <span className="documents-item-badge">private</span>}
                </span>
                <span className="documents-item-meta">
                  {d.slug && <code className="documents-item-slug">{d.slug}</code>}
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
