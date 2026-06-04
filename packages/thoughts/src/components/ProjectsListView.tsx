import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { postThought } from '../api';
import { AuthContext } from '../auth-context';
import { useProjects } from '../hooks/useCache';

export function ProjectsListView() {
  const { secret } = useContext(AuthContext);
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const { data, mutate } = useProjects(showArchived ? 'all' : 'active');
  const projects = data?.projects ?? [];
  const loading = !data;

  const addProject = async () => {
    const title = newTitle.trim();
    if (!title || !secret || adding) return;
    setAdding(true);
    setAddError('');
    try {
      await postThought(`#p ${title}`, secret);
      setNewTitle('');
      mutate();
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add project');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="projects-view">
      <div className="tasks-header">
        <h2 className="tasks-title">Projects</h2>
        <label className="tasks-toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={() => setShowArchived(!showArchived)}
          />
          Show archived
        </label>
      </div>
      {secret && (
        <form
          className="task-add"
          onSubmit={(e) => {
            e.preventDefault();
            addProject();
          }}
        >
          <input
            type="text"
            className="task-add-input"
            placeholder="New project…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={adding}
          />
          <button type="submit" className="task-add-btn" disabled={adding || !newTitle.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </button>
          {addError && <span className="task-add-error">{addError}</span>}
        </form>
      )}
      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="thought-loading">No projects</div>
      ) : (
        <ul className="projects-list">
          {projects.map((p) => {
            const total = p.task_count ?? 0;
            const done = p.completed_count ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <li key={p.id} className={`project-card${p.archived_at != null ? ' project-card--archived' : ''}`}>
                <Link to="/projects/$id" params={{ id: p.id }} className="project-card-link">
                  <div className="project-card-title">{p.title}</div>
                  {p.description && <div className="project-card-desc">{p.description}</div>}
                  <div className="project-card-meta">
                    <div className="project-progress" title={`${done} of ${total} tasks complete`}>
                      <div className="project-progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="project-card-count">{done}/{total}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
