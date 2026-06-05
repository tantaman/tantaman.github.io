import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  patchTask,
  patchProject,
  createProjectTask,
  deleteTask,
  addTaskBlocker,
  removeTaskBlocker,
  convertProject,
  reorderProjectTasks,
} from '../../api';
import { AuthContext } from '../../auth-context';
import { useProject } from '../../hooks/useCache';
import type { ProjectDetail, ProjectTask } from '../../types';
import { BlockerCombobox } from './BlockerCombobox';

type Group = 'ready' | 'blocked' | 'completed';

const nowSec = () => Math.floor(Date.now() / 1000);

export function ProjectView({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  const { data, mutate } = useProject(id);

  const [cmd, setCmd] = useState('');
  const [err, setErr] = useState('');
  const [subtaskFor, setSubtaskFor] = useState<number | null>(null);
  const [subtaskText, setSubtaskText] = useState('');
  const [blockerFor, setBlockerFor] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState('');

  const project = data?.project;
  const tasks = data?.tasks ?? [];
  const deps = data?.deps ?? [];
  const isDraft = project?.status === 'draft';
  const isArchived = project?.archived_at != null;
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

  const total = tasks.length;
  const done = grouped.completed.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Optimistic write: show `next` immediately, run `fn`, then revalidate against
  // the server (which also rolls back if the request failed).
  const apply = (next: ProjectDetail, fn: () => Promise<unknown>) => {
    if (!secret) return;
    setErr('');
    mutate(next, { revalidate: false });
    fn().then(
      () => mutate(),
      (e: { message?: string }) => {
        setErr(e?.message || 'Something went wrong');
        mutate();
      },
    );
  };

  const withTasks = (ts: ProjectTask[]): ProjectDetail => ({ ...data!, tasks: ts });

  // ── Tasks ──────────────────────────────────────────────────────────────
  const submitCmd = () => {
    let title = cmd.trim();
    if (!title || !canEdit) return;
    title = title.replace(/^#t\s+/i, '').trim();
    if (!title) return;
    const temp: ProjectTask = {
      id: -Date.now(),
      thought_id: null,
      project_id: id,
      title,
      description: null,
      created_at: nowSec(),
      completed_at: null,
      deprioritized_at: null,
      position: null,
    };
    setCmd('');
    apply(withTasks([...tasks, temp]), () => createProjectTask(id, title, secret!));
  };

  const toggleComplete = (t: ProjectTask) => {
    const completed = t.completed_at === null;
    apply(
      withTasks(tasks.map((x) => (x.id === t.id ? { ...x, completed_at: completed ? nowSec() : null } : x))),
      () => patchTask(t.id, { completed }, secret!),
    );
  };

  const toggleDeprioritize = (t: ProjectTask) => {
    const dep = t.deprioritized_at == null;
    apply(
      withTasks(tasks.map((x) => (x.id === t.id ? { ...x, deprioritized_at: dep ? nowSec() : null } : x))),
      () => patchTask(t.id, { deprioritized: dep }, secret!),
    );
  };

  const removeTask = (t: ProjectTask) => {
    apply(
      {
        ...data!,
        tasks: tasks.filter((x) => x.id !== t.id),
        deps: deps.filter((d) => d.blocker_task_id !== t.id && d.blocked_task_id !== t.id),
      },
      () => deleteTask(t.id, secret!),
    );
  };

  const saveEdit = (t: ProjectTask) => {
    const title = editText.trim();
    setEditId(null);
    if (!title || title === t.title) return;
    apply(withTasks(tasks.map((x) => (x.id === t.id ? { ...x, title } : x))), () =>
      patchTask(t.id, { title }, secret!),
    );
  };

  const addSubtask = (parent: ProjectTask) => {
    const title = subtaskText.trim();
    if (!title || !secret) return;
    const tempId = -Date.now();
    const temp: ProjectTask = {
      id: tempId,
      thought_id: null,
      project_id: id,
      title,
      description: null,
      created_at: nowSec(),
      completed_at: null,
      deprioritized_at: null,
      position: null,
    };
    setSubtaskText('');
    setSubtaskFor(null);
    apply(
      {
        ...data!,
        tasks: [...tasks, temp],
        deps: [...deps, { blocker_task_id: parent.id, blocked_task_id: tempId }],
      },
      async () => {
        const child = await createProjectTask(id, title, secret!);
        await addTaskBlocker(child.id, parent.id, secret!);
      },
    );
  };

  const addBlocker = (t: ProjectTask, blockerId: number) => {
    setBlockerFor(null);
    apply(
      { ...data!, deps: [...deps, { blocker_task_id: blockerId, blocked_task_id: t.id }] },
      () => addTaskBlocker(t.id, blockerId, secret!),
    );
  };

  const removeBlocker = (t: ProjectTask, blockerId: number) => {
    apply(
      {
        ...data!,
        deps: deps.filter((d) => !(d.blocked_task_id === t.id && d.blocker_task_id === blockerId)),
      },
      () => removeTaskBlocker(t.id, blockerId, secret!),
    );
  };

  const dropOnTask = (targetId: number) => {
    if (dragId == null || dragId === targetId) {
      setDragId(null);
      return;
    }
    const readyIds = grouped.ready.map((t) => t.id);
    const from = readyIds.indexOf(dragId);
    const to = readyIds.indexOf(targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;
    // Removing the dragged item shifts later indices down by one, so when
    // dragging forward (from < to) the insert index must be decremented to land
    // the item just before the drop target. Result: "insert before target" in
    // both directions.
    const [moved] = readyIds.splice(from, 1);
    readyIds.splice(from < to ? to - 1 : to, 0, moved);
    const orderedIds = [
      ...readyIds,
      ...grouped.blocked.map((t) => t.id),
      ...grouped.completed.map((t) => t.id),
    ];
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const nextTasks = orderedIds.map((i) => byId.get(i)!).filter(Boolean);
    apply(withTasks(nextTasks), () => reorderProjectTasks(id, orderedIds, secret!));
  };

  // ── Header ─────────────────────────────────────────────────────────────
  const saveTitle = () => {
    const v = titleText.trim();
    setEditingTitle(false);
    if (!v || !project || v === project.title) return;
    apply({ ...data!, project: { ...project, title: v } }, () => patchProject(id, { title: v }, secret!));
  };

  const saveDesc = () => {
    const v = descText.trim();
    setEditingDesc(false);
    if (!project || v === (project.description ?? '')) return;
    apply({ ...data!, project: { ...project, description: v || null } }, () =>
      patchProject(id, { description: v || null }, secret!),
    );
  };

  const doConvert = () => {
    if (!project) return;
    apply({ ...data!, project: { ...project, status: 'active' } }, () => convertProject(id, secret!));
  };

  const doArchive = () => {
    if (!project) return;
    const archiving = project.archived_at == null;
    apply(
      { ...data!, project: { ...project, archived_at: archiving ? nowSec() : null, status: archiving ? 'archived' : 'active' } },
      () => patchProject(id, { archived: archiving }, secret!),
    );
  };

  if (!data) return <div className="thought-loading">Loading…</div>;
  if (!project) return <div className="thought-loading">Project not found</div>;

  const renderTask = (t: ProjectTask, draggable: boolean) => {
    const blockers = blockersByTask.get(t.id) ?? [];
    // A task with a negative id is an optimistic placeholder awaiting its real
    // server id. Block id-dependent interactions (edit/drag/blocker/delete)
    // until it lands, so e.g. an in-progress rename isn't lost when the row's
    // key flips from temp id to real id on revalidation.
    const pending = t.id < 0;
    const editable = canEdit && !pending;
    const canDrag = draggable && !pending;
    const titleCls = `task-title${t.completed_at !== null ? ' task-title--done' : ''}${
      t.deprioritized_at != null && t.completed_at === null ? ' task-title--deprioritized' : ''
    }`;
    return (
      <li
        key={t.id}
        className={`project-task${dragId === t.id ? ' project-task--dragging' : ''}`}
        draggable={canDrag}
        onDragStart={canDrag ? () => setDragId(t.id) : undefined}
        onDragOver={canDrag ? (e) => e.preventDefault() : undefined}
        onDrop={canDrag ? () => dropOnTask(t.id) : undefined}
        onDragEnd={() => setDragId(null)}
      >
        <div className="task-row">
          {canDrag && <span className="project-task-handle" title="Drag to reorder">⠿</span>}
          <input
            type="checkbox"
            className="task-checkbox"
            checked={t.completed_at !== null}
            disabled={!editable}
            onChange={() => toggleComplete(t)}
            title="Complete"
          />
          <button
            className={`task-deprioritize-btn${t.deprioritized_at != null ? ' task-deprioritize-btn--active' : ''}`}
            disabled={!editable}
            onClick={() => toggleDeprioritize(t)}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(t);
                if (e.key === 'Escape') setEditId(null);
              }}
            />
          ) : t.thought_id != null ? (
            <Link
              to="/t/$id"
              params={{ id: t.thought_id }}
              className={titleCls}
              title="From a captured thought"
            >
              {t.title}
            </Link>
          ) : (
            <span
              className={titleCls}
              title={editable ? 'Click to rename' : undefined}
              onClick={() => {
                if (editable) {
                  setEditId(t.id);
                  setEditText(t.title);
                }
              }}
            >
              {t.title}
            </span>
          )}

          {editable && editId !== t.id && (
            <div className="project-task-actions">
              <button className="project-task-action" onClick={() => { setEditId(t.id); setEditText(t.title); }} title="Rename">✎</button>
              <button className="project-task-action" onClick={() => { setSubtaskFor(subtaskFor === t.id ? null : t.id); setSubtaskText(''); }} title="Add a dependent subtask">+ subtask</button>
              <button className="project-task-action" onClick={() => setBlockerFor(blockerFor === t.id ? null : t.id)} title="Mark this task as blocked by another">+ blocker</button>
              <button className="project-task-action project-task-action--danger" onClick={() => removeTask(t)} title="Delete task">🗑</button>
            </div>
          )}
        </div>

        {blockers.length > 0 && (
          <div className="project-task-blockers">
            {blockers.map((bid) => {
              const bt = taskById.get(bid);
              const done2 = isComplete(bid);
              return (
                <span key={bid} className={`project-blocker-chip${done2 ? ' project-blocker-chip--done' : ''}`}>
                  ⛔ {bt ? bt.title : `#${bid}`}
                  {editable && (
                    <button className="project-blocker-remove" title="Remove dependency" onClick={() => removeBlocker(t, bid)}>×</button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {blockerFor === t.id && editable && (
          <div className="project-blocker-picker">
            <BlockerCombobox
              options={tasks.filter((o) => o.id !== t.id && !blockers.includes(o.id))}
              onPick={(blockerId) => addBlocker(t, blockerId)}
              onCancel={() => setBlockerFor(null)}
            />
          </div>
        )}

        {subtaskFor === t.id && editable && (
          <form className="task-add project-subtask-add" onSubmit={(e) => { e.preventDefault(); addSubtask(t); }}>
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
      <div className="project-header">
        <div className="project-header-main">
          {editingTitle && secret ? (
            <input
              type="text"
              className="task-add-input project-title-edit"
              value={titleText}
              autoFocus
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
            />
          ) : (
            <h2
              className="project-title"
              title={secret ? 'Click to rename' : undefined}
              onClick={() => { if (secret) { setEditingTitle(true); setTitleText(project.title); } }}
            >
              {project.title}
            </h2>
          )}
          <div className="project-status-row">
            <span className={`project-status-pill project-status-pill--${isArchived ? 'archived' : project.status}`}>
              {isArchived ? 'archived' : project.status}
            </span>
            <span className="project-progress-text">{done}/{total} done</span>
          </div>

          {editingDesc && secret ? (
            <textarea
              className="task-add-input project-desc-edit"
              value={descText}
              autoFocus
              rows={2}
              onChange={(e) => setDescText(e.target.value)}
              onBlur={saveDesc}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingDesc(false);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDesc();
              }}
            />
          ) : project.description ? (
            <p
              className="project-detail-desc"
              title={secret ? 'Click to edit' : undefined}
              onClick={() => { if (secret) { setEditingDesc(true); setDescText(project.description ?? ''); } }}
            >
              {project.description}
            </p>
          ) : secret ? (
            <button className="project-desc-add" onClick={() => { setEditingDesc(true); setDescText(''); }}>
              + add description
            </button>
          ) : null}
        </div>

        <div className="project-header-side">
          <ProgressRing pct={pct} />
          <div className="project-detail-controls">
            {project.thought_id != null && (
              <Link to="/t/$id" params={{ id: project.thought_id }} className="project-task-action">open thread</Link>
            )}
            {secret && !isDraft && (
              <button className="project-task-action" onClick={doArchive}>
                {isArchived ? 'Unarchive' : 'Archive'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isDraft && secret && (
        <div className="project-draft-banner">
          <span>This project is still a draft — captured from thoughts. Convert it to start editing tasks directly.</span>
          <button className="task-add-btn" onClick={doConvert}>Convert to project</button>
        </div>
      )}

      {err && <div className="task-add-error">{err}</div>}

      {canEdit && (
        <form className="project-command-bar" onSubmit={(e) => { e.preventDefault(); submitCmd(); }}>
          <span className="project-command-glyph">⌨</span>
          <input
            type="text"
            className="project-command-input"
            placeholder="Add a task…   (type, or #t)"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
          />
          <button type="submit" className="task-add-btn" disabled={!cmd.trim()}>Add</button>
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
              <ul className="tasks-list">{grouped.ready.map((t) => renderTask(t, canEdit))}</ul>
            </section>
          )}
          {grouped.blocked.length > 0 && (
            <section className="project-group">
              <h3 className="project-group-title">Blocked <span className="project-group-count">{grouped.blocked.length}</span></h3>
              <ul className="tasks-list">{grouped.blocked.map((t) => renderTask(t, false))}</ul>
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
              {showCompleted && <ul className="tasks-list">{grouped.completed.map((t) => renderTask(t, false))}</ul>}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <svg className="project-ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="22" className="project-ring-label" textAnchor="middle" dominantBaseline="central">{pct}%</text>
    </svg>
  );
}
