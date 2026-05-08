import { useContext } from 'react';
import { AuthContext } from '../App';
import { useDocuments } from '../hooks/useCache';

export function DocumentsSidebar({ currentId }: { currentId?: number }) {
  const { secret } = useContext(AuthContext);
  const { data } = useDocuments(secret);
  const documents = data?.documents ?? [];

  return (
    <aside className="document-sidebar">
      <div className="document-sidebar-header">
        <a href="/thoughts/" className="document-sidebar-home" title="Back to Thoughts">⌂</a>
        <a href="#documents" className="document-sidebar-title">Documents</a>
        <a href="#document-new" className="document-sidebar-new" title="New document">+</a>
      </div>
      <nav className="document-sidebar-list">
        {documents.length === 0 ? (
          <span className="document-sidebar-empty">No documents</span>
        ) : (
          documents.map((d) => (
            <a
              key={d.id}
              href={`#document-${d.id}`}
              className={`document-sidebar-item${d.id === currentId ? ' active' : ''}`}
              title={d.title}
            >
              <span className="document-sidebar-item-name">
                {d.title || 'Untitled'}
              </span>
              {d.private && <span className="document-sidebar-item-badge">·</span>}
            </a>
          ))
        )}
      </nav>
    </aside>
  );
}
