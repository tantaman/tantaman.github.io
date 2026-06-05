import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  patchTask, patchProject, createProjectTask, deleteTask,
  addTaskBlocker, removeTaskBlocker, convertProject,
} from '../api';
import { AuthContext } from '../auth-context';
import { useProject } from '../hooks/useCache';
import type { ProjectTask } from '../types';

type Group = 'ready' | 'blocked' | 'completed';

export function ProjectView({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useProject(id);
  const [newTask, setNewTask] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [subtaskFor, setSubtaskFor] = useState<number | null>(null);
  const [subtaskText, setSubtaskText] = useState('');
  const [blockerFor, setBlockerFor] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const project = data?.project;
  const tasks = data?.tasks ?? [];
  const deps = data?.deps ?? [];
  const isDraft = project?.status === 'draft';
  const canEdit = !!secret && project?.status === 'active';

  const taskById = useMemo(() => {
    const m = new Map<number, ProjectTask>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  // blocked_task_id → blocker task ids
  const blockersByTask = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const d of deps) {
      const arr = m.get(d.blocked_task_id) ?? [];
      arr.push(d.blocker_task_id);
      m.set(d.blocked_task_id, arr);
    }
    return m;
  }, [deps]);

  const isComplete = (taskId: number) => {
    const t = taskById.get(taskId);
    return t ? t.completed_at !== null : true;
  };

  const groupOf = (t: ProjectTask): Group => {
    if (t.completed_at !== null) return 'completed';
    const blockers = blockersByTask.get(t.id) ?? [];
    return blockers.some((b) => !isComplete(b)) ? 'blocked' : 'ready';
  };

  const grouped = useMemo(() => {
    const g: Record<Group, ProjectTask[]> = { ready: [], blocked: [], completed: [] };
    for (const t of tasks) g[groupOf(t)].push(t);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, deps]);

  const wrap = async (fn: () => Promise<unknown>) => {
    if (!secret) return;
    setErr('');
    try { await fn(); mutate(); }
    catch (e: any) { setErr(e?.message || 'Something went wrong'); mutate(); }
  };

  const addTask = async () => {
    const title = newTask.trim();
    if (!title || !canEdit || busy) return;
    setBusy(true);
    await wrap(async () => { await createProjectTask(id, title, secret!); setNewTask(''); });
    setBusy(false);
  };

  const addSubtask = async (parentTaskId: number) => {
    const title = subtaskText.trim();
    if (!title || !secret) return;
    await wrap(async () => {
      const child = await createProjectTask(id, title, secret);
      await addTaskBlocker(child.id, parentTaskId, secret);
      setSubtaskText('');
      setSubtaskFor(null);
    });
  };

  const saveEdit = async (t: ProjectTask) => {
    const title = editText.trim();
    setEditId(null);
    if (!title || !secret || title === t.title) return;
    await wrap(() => patchTask(t.id, { title }, secret));
  };

  if (!data) return <div className="thought-loading">Loading…</div>;
  if (!project) return <div className="thought-loading">Project not found</div>;

  const renderTask = (t: ProjectTask) => {
    const blockers = blockersByTask.get(t.id) ?? [];
    return (
      <li key={t.id} className="project-task">
        <div className="task-row">
          <input
            type="checkbox"
            className="task-checkbox"
            checked={t.completed_at !== null}
            disabled={!secret}
            onChange={() => wrap(() => patchTask(t.id, { completed: t.completed_at === null }, secret!))}
            title="Complete"
          />
          <button
            className={`task-deprioritize-btn${t.deprioritized_at != null ? ' task-deprioritize-btn--active' : ''}`}
            disabled={!secret}
            onClick={() => wrap(() => patchTask(t.id, { deprioritized: t.deprioritized_at == null }, secret!))}
            title="De-prioritize"
          >
            −
          </button>

          {editId === t.id ? (
            <input
              type="text"
              className="task-add-input project-task-edit"
              value={editText}
              autoFocus
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => saveEdit(t)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditId(null); }}
            />
          ) : t.thought_id != null ? (
            <Link
              to="/t/$id"
              params={{ id: t.thought_id }}
              className={`task-title${t.completed_at !== null ? ' task-title--done' : ''}${t.deprioritized_at != null && t.completed_at === null ? ' task-title--deprioritized' : ''}`}
              title="From a captured thought"
            >
              {t.title}
            </Link>
          ) : (
            <span
              className={`task-title${t.completed_at !== null ? ' task-title--done' : ''}${t.deprioritized_at != null && t.completed_at === null ? ' task-title--deprioritized' : ''}`}
              onDoubleClick={() => { if (canEdit) { setEditId(t.id); setEditText(t.title); } }}
            >
              {t.title}
            </span>
          )}

          {canEdit && editId !== t.id && (
            <div className="project-task-actions">
              <button className="project-task-action" onClick={() => { setEditId(t.id); setEditText(t.title); }} title="Rename">✎</button>
              <button className="project-task-action" onClick={() => { setSubtaskFor(subtaskFor === t.id ? null : t.id); setSubtaskText(''); }} title="Add a dependent subtask">+ subtask</button>
              <button className="project-task-action" onClick={() => setBlockerFor(blockerFor === t.id ? null : t.id)} title="Mark this task as blocked by another">+ blocker</button>
              <button className="project-task-action project-task-action--danger" onClick={() => wrap(() => deleteTask(t.id, secret!))} title="Delete task">🗑</button>
            </div>
          )}
        </div>

        {blockers.length > 0 && (
          <div className="project-task-blockers">
            {blockers.map((bid) => {
              const bt = taskById.get(bid);
              const done = isComplete(bid);
              return (
                <span key={bid} className={`project-blocker-chip${done ? ' project-blocker-chip--done' : ''}`}>
                  ⛔ {bt ? bt.title : `#${bid}`}
                  {canEdit && (
                    <button className="project-blocker-remove" title="Remove dependency" onClick={() => wrap(() => removeTaskBlocker(t.id, bid, secret!))}>×</button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {blockerFor === t.id && canEdit && (
          <div className="project-blocker-picker">
            <select
              defaultValue=""
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) { setBlockerFor(null); wrap(() => addTaskBlocker(t.id, v, secret!)); } }}
            >
              <option value="" disabled>Blocked by…</option>
              {tasks
                .filter((o) => o.id !== t.id && !blockers.includes(o.id))
                .map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
        )}

        {subtaskFor === t.id && canEdit && (
          <form className="task-add project-subtask-add" onSubmit={(e) => { e.preventDefault(); addSubtask(t.id); }}>
            <input
              type="text"
              className="task-add-input"
              placeholder="Dependent subtask…"
              value={subtaskText}
              autoFocus
              onChange={(e) => setSubtaskText(e.target.value)}
            />
            <button type="submit" className="task-add-btn" disabled={!subtaskText.trim()}>Add</button>
          </form>
        )}
      </li>
    );
  };

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <div>
          <Link to="/projects" className="project-back">← Projects</Link>
          <h2 className="tasks-title">
            {project.title}
            {isDraft && <span className="project-archived-badge">draft</span>}
            {project.archived_at != null && <span className="project-archived-badge">archived</span>}
          </h2>
          {project.description && <p className="project-detail-desc">{project.description}</p>}
        </div>
        <div className="project-detail-controls">
          {project.thought_id != null && (
            <Link to="/t/$id" params={{ id: project.thought_id }} className="project-task-action">open thread</Link>
          )}
          {secret && !isDraft && (
            <button className="project-task-action" onClick={() => wrap(() => patchProject(project.id, { archived: project.archived_at == null }, secret))}>
              {project.archived_at != null ? 'Unarchive' : 'Archive'}
            </button>
          )}
        </div>
      </div>

      {isDraft && secret && (
        <div className="project-draft-banner">
          <span>This project is still a draft — captured from thoughts. Convert it to start editing tasks directly.</span>
          <button className="task-add-btn" onClick={() => wrap(() => convertProject(project.id, secret))}>Convert to project</button>
        </div>
      )}

      {err && <div className="task-add-error">{err}</div>}

      {canEdit && (
        <form className="task-add" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
          <input
            type="text"
            className="task-add-input"
            placeholder="Add a task…"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="task-add-btn" disabled={busy || !newTask.trim()}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="thought-loading">
          No tasks yet.{isDraft ? ' Reply to the project thread with ' : ' Add one above, or reply to a thought with '}<code>#t</code>.
        </div>
      ) : (
        <>
          {grouped.ready.length > 0 && (
            <section className="project-group">
              <h3 className="project-group-title">Ready <span className="project-group-count">{grouped.ready.length}</span></h3>
              <ul className="tasks-list">{grouped.ready.map(renderTask)}</ul>
            </section>
          )}
          {grouped.blocked.length > 0 && (
            <section className="project-group">
              <h3 className="project-group-title">Blocked <span className="project-group-count">{grouped.blocked.length}</span></h3>
              <ul className="tasks-list">{grouped.blocked.map(renderTask)}</ul>
            </section>
          )}
          {grouped.completed.length > 0 && (
            <section className="project-group">
              <h3 className="project-group-title">
                <label className="tasks-toggle">
                  <input type="checkbox" checked={showCompleted} onChange={() => setShowCompleted(!showCompleted)} />
                  Completed <span className="project-group-count">{grouped.completed.length}</span>
                </label>
              </h3>
              {showCompleted && <ul className="tasks-list">{grouped.completed.map(renderTask)}</ul>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
