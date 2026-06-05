import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { createProject } from '../../api';
import { AuthContext } from '../../auth-context';
import { useProjects } from '../../hooks/useCache';
import type { Project } from '../../types';

function RailItem({ p, active }: { p: Project; active: boolean }) {
  const total = p.task_count ?? 0;
  const done = p.completed_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Link
      to="/projects/$id"
      params={{ id: p.id }}
      className={`project-rail-item${active ? ' active' : ''}`}
    >
      <div className="project-rail-item-title">{p.title}</div>
      <div className="project-rail-item-meta">
        <span className="project-rail-bar"><span className="project-rail-bar-fill" style={{ width: `${pct}%` }} /></span>
        <span className="project-rail-count">{done}/{total}</span>
      </div>
    </Link>
  );
}

export function ProjectSwitcherRail({ activeId }: { activeId: number | null }) {
  const { secret } = useContext(AuthContext);
  const { data: activeData, mutate: mutateActive } = useProjects('active');
  const { data: draftData } = useProjects('draft');
  const { data: archivedData } = useProjects('archived');

  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const active = activeData?.projects ?? [];
  const drafts = draftData?.projects ?? [];
  const archived = archivedData?.projects ?? [];

  const add = async () => {
    const v = title.trim();
    if (!v || !secret || adding) return;
    setAdding(true);
    try {
      await createProject(v, secret);
      setTitle('');
      mutateActive();
    } finally {
      setAdding(false);
    }
  };

  return (
    <aside className="project-switcher-rail">
      <div className="project-rail-head">
        <Link to="/" className="project-rail-back">‹ Thoughts</Link>
        <span className="project-rail-heading">Projects</span>
      </div>

      {secret && (
        <form
          className="project-rail-add"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            type="text"
            className="task-add-input"
            placeholder="New project…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={adding}
          />
        </form>
      )}

      <nav className="project-rail-list">
        {active.length === 0 && drafts.length === 0 && (
          <div className="project-rail-empty">No projects yet.</div>
        )}

        {active.map((p) => (
          <RailItem key={p.id} p={p} active={p.id === activeId} />
        ))}

        {drafts.length > 0 && (
          <>
            <div className="project-rail-group-label">Drafts <span>{drafts.length}</span></div>
            {drafts.map((p) => (
              <RailItem key={p.id} p={p} active={p.id === activeId} />
            ))}
          </>
        )}

        {archived.length > 0 && (
          <>
            <button className="project-rail-group-toggle" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? '▾' : '▸'} Archived <span>{archived.length}</span>
            </button>
            {showArchived && archived.map((p) => (
              <RailItem key={p.id} p={p} active={p.id === activeId} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
