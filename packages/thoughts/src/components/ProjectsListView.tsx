import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { createProject, convertProject } from '../api';
import { AuthContext } from '../auth-context';
import { useProjects } from '../hooks/useCache';
import type { Project } from '../types';

function ProgressCard({ p }: { p: Project }) {
  const total = p.task_count ?? 0;
  const done = p.completed_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
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
  );
}

export function ProjectsListView() {
  const { secret } = useContext(AuthContext);
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const { data, mutate } = useProjects(showArchived ? 'all' : 'active');
  const { data: draftData, mutate: mutateDrafts } = useProjects('draft');
  const projects = (data?.projects ?? []).filter((p) => p.status !== 'draft');
  const drafts = draftData?.projects ?? [];
  const loading = !data;

  const addProject = async () => {
    const title = newTitle.trim();
    if (!title || !secret || adding) return;
    setAdding(true);
    setAddError('');
    try {
      await createProject(title, secret);
      setNewTitle('');
      mutate();
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add project');
    } finally {
      setAdding(false);
    }
  };

  const convert = async (id: number) => {
    if (!secret) return;
    try {
      await convertProject(id, secret);
      mutateDrafts();
      mutate();
    } catch (e: any) {
      setAddError(e?.message || 'Failed to convert project');
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

      {drafts.length > 0 && (
        <section className="project-group">
          <h3 className="project-group-title">
            Drafts <span className="project-group-count">{drafts.length}</span>
          </h3>
          <p className="project-drafts-hint">
            Started from a <code>#p</code> thought. Convert when the brainstorm is ready.
          </p>
          <ul className="projects-list">
            {drafts.map((p) => (
              <li key={p.id} className="project-card project-card--draft">
                <Link to="/projects/$id" params={{ id: p.id }} className="project-card-link">
                  <div className="project-card-title">{p.title}</div>
                  {p.description && <div className="project-card-desc">{p.description}</div>}
                  <div className="project-card-count">{p.task_count ?? 0} task{(p.task_count ?? 0) === 1 ? '' : 's'} captured</div>
                </Link>
                {secret && (
                  <div className="project-card-actions">
                    <button className="project-task-action" onClick={() => convert(p.id)}>Convert to project</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="thought-loading">No projects</div>
      ) : (
        <ul className="projects-list">
          {projects.map((p) => (
            <li key={p.id} className={`project-card${p.archived_at != null ? ' project-card--archived' : ''}`}>
              <ProgressCard p={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
