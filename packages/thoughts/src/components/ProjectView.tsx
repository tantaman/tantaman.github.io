import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { postThought, patchTask, patchProject, addBlocker, removeBlocker } from '../api';
import { AuthContext } from '../auth-context';
import { useProject } from '../hooks/useCache';
import type { ProjectTask, ProjectDependency } from '../types';

type Group = 'ready' | 'blocked' | 'completed';

export function ProjectView({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useProject(id);
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [blockerFor, setBlockerFor] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const project = data?.project;
  const tasks = data?.tasks ?? [];
  const deps = data?.deps ?? [];

  // thought_id → its task (tasks are 1:1 with reply thoughts in the project flow).
  const taskByThought = useMemo(() => {
    const m = new Map<number, ProjectTask>();
    for (const t of tasks) m.set(t.thought_id, t);
    return m;
  }, [tasks]);

  // blocked_thought_id → blocker thought ids
  const blockersByThought = useMemo(() => {
    const m = new Map<number, ProjectDependency[]>();
    for (const d of deps) {
      const arr = m.get(d.blocked_thought_id) ?? [];
      arr.push(d);
      m.set(d.blocked_thought_id, arr);
    }
    return m;
  }, [deps]);

  const isComplete = (thoughtId: number) => {
    const t = taskByThought.get(thoughtId);
    return t ? t.completed_at !== null : true; // unknown blocker → treat as satisfied
  };

  const groupOf = (t: ProjectTask): Group => {
    if (t.completed_at !== null) return 'completed';
    const blockers = blockersByThought.get(t.thought_id) ?? [];
    const open = blockers.some((b) => !isComplete(b.blocker_thought_id));
    return open ? 'blocked' : 'ready';
  };

  const grouped = useMemo(() => {
    const g: Record<Group, ProjectTask[]> = { ready: [], blocked: [], completed: [] };
    for (const t of tasks) g[groupOf(t)].push(t);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, deps]);

  const addTask = async () => {
    const title = newTask.trim();
    if (!title || !secret || adding || !project) return;
    setAdding(true);
    setErr('');
    try {
      // Reply to the project root → resolves into this project, becomes a top task.
      await postThought(`#t ${title}`, secret, project.thought_id);
      setNewTask('');
      mutate();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const addSubtask = async (parentThoughtId: number) => {
    const title = replyText.trim();
    if (!title || !secret) return;
    try {
      // Reply to the task → child task, blocked-by the parent via the reply tree.
      await postThought(`#t ${title}`, secret, parentThoughtId);
      setReplyText('');
      setReplyTo(null);
      mutate();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add subtask');
    }
  };

  const toggleComplete = async (t: ProjectTask) => {
    if (!secret) return;
    try {
      await patchTask(t.id, { completed: t.completed_at === null }, secret);
      mutate();
    } catch { mutate(); }
  };

  const toggleDeprioritize = async (t: ProjectTask) => {
    if (!secret) return;
    try {
      await patchTask(t.id, { deprioritized: t.deprioritized_at == null }, secret);
      mutate();
    } catch { mutate(); }
  };

  const onAddBlocker = async (blockedThoughtId: number, blockerThoughtId: number) => {
    if (!secret) return;
    setBlockerFor(null);
    try {
      await addBlocker(blockedThoughtId, blockerThoughtId, secret);
      mutate();
    } catch (e: any) { setErr(e?.message || 'Failed to add dependency'); }
  };

  const onRemoveBlocker = async (blockedThoughtId: number, blockerThoughtId: number) => {
    if (!secret) return;
    try {
      await removeBlocker(blockedThoughtId, blockerThoughtId, secret);
      mutate();
    } catch (e: any) { setErr(e?.message || 'Failed to remove dependency'); }
  };

  const toggleArchive = async () => {
    if (!secret || !project) return;
    try {
      await patchProject(project.id, { archived: project.archived_at == null }, secret);
      mutate();
    } catch (e: any) { setErr(e?.message || 'Failed to update project'); }
  };

  if (!data) return <div className="thought-loading">Loading…</div>;
  if (!project) return <div className="thought-loading">Project not found</div>;

  const renderTask = (t: ProjectTask) => {
    const blockers = (blockersByThought.get(t.thought_id) ?? []);
    return (
      <li key={t.id} className="project-task">
        <div className="task-row">
          <input
            type="checkbox"
            className="task-checkbox"
            checked={t.completed_at !== null}
            disabled={!secret}
            onChange={() => toggleComplete(t)}
            title="Complete"
          />
          <button
            className={`task-deprioritize-btn${t.deprioritized_at != null ? ' task-deprioritize-btn--active' : ''}`}
            disabled={!secret}
            onClick={() => toggleDeprioritize(t)}
            title="De-prioritize"
          >
            −
          </button>
          <Link
            to="/t/$id"
            params={{ id: t.thought_id }}
            className={`task-title${t.completed_at !== null ? ' task-title--done' : ''}${t.deprioritized_at != null && t.completed_at === null ? ' task-title--deprioritized' : ''}`}
          >
            {t.title}
          </Link>
          {secret && (
            <div className="project-task-actions">
              <button className="project-task-action" onClick={() => { setReplyTo(replyTo === t.thought_id ? null : t.thought_id); setReplyText(''); }} title="Add a dependent subtask">+ subtask</button>
              <button className="project-task-action" onClick={() => setBlockerFor(blockerFor === t.thought_id ? null : t.thought_id)} title="Mark this task as blocked by another">+ blocker</button>
            </div>
          )}
        </div>

        {blockers.length > 0 && (
          <div className="project-task-blockers">
            {blockers.map((b) => {
              const bt = taskByThought.get(b.blocker_thought_id);
              const done = isComplete(b.blocker_thought_id);
              return (
                <span key={`${b.blocker_thought_id}-${b.kind}`} className={`project-blocker-chip${done ? ' project-blocker-chip--done' : ''}`}>
                  {b.kind === 'reply' ? '↳ ' : '⛔ '}{bt ? bt.title : `#${b.blocker_thought_id}`}
                  {secret && b.kind === 'blocks' && (
                    <button className="project-blocker-remove" title="Remove dependency" onClick={() => onRemoveBlocker(t.thought_id, b.blocker_thought_id)}>×</button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {blockerFor === t.thought_id && (
          <div className="project-blocker-picker">
            <select
              defaultValue=""
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) onAddBlocker(t.thought_id, v); }}
            >
              <option value="" disabled>Blocked by…</option>
              {tasks
                .filter((o) => o.thought_id !== t.thought_id && !blockers.some((b) => b.blocker_thought_id === o.thought_id))
                .map((o) => <option key={o.id} value={o.thought_id}>{o.title}</option>)}
            </select>
          </div>
        )}

        {replyTo === t.thought_id && secret && (
          <form className="task-add project-subtask-add" onSubmit={(e) => { e.preventDefault(); addSubtask(t.thought_id); }}>
            <input
              type="text"
              className="task-add-input"
              placeholder="Dependent subtask…"
              value={replyText}
              autoFocus
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button type="submit" className="task-add-btn" disabled={!replyText.trim()}>Add</button>
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
            {project.archived_at != null && <span className="project-archived-badge">archived</span>}
          </h2>
          {project.description && <p className="project-detail-desc">{project.description}</p>}
        </div>
        <div className="project-detail-controls">
          <Link to="/t/$id" params={{ id: project.thought_id }} className="project-task-action">open thread</Link>
          {secret && (
            <button className="project-task-action" onClick={toggleArchive}>
              {project.archived_at != null ? 'Unarchive' : 'Archive'}
            </button>
          )}
        </div>
      </div>

      {err && <div className="task-add-error">{err}</div>}

      {secret && (
        <form className="task-add" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
          <input
            type="text"
            className="task-add-input"
            placeholder="Add a task…"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            disabled={adding}
          />
          <button type="submit" className="task-add-btn" disabled={adding || !newTask.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="thought-loading">No tasks yet. Add one above, or reply to the project thread with <code>#t</code>.</div>
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
