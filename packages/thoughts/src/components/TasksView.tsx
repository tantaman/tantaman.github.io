import { useContext, useState } from 'react';
import { patchTask, postThought } from '../api';
import { AuthContext } from '../App';
import { useTasks } from '../hooks/useCache';

export function TasksView({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeprioritized, setShowDeprioritized] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const status = showCompleted || showDeprioritized ? 'all' : 'incomplete';
  const { data, mutate } = useTasks(status, tags);
  const allTasks = data?.tasks ?? [];
  const loading = !data;

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title || !secret || adding) return;
    setAdding(true);
    setAddError('');
    const body = tags.length > 0
      ? `#t ${title}\n\n${tags.map((t) => `#${t}`).join(' ')}`
      : `#t ${title}`;
    try {
      await postThought(body, secret);
      setNewTitle('');
      mutate();
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  // Client-side filter when showing all: hide categories user hasn't toggled on
  const tasks = status === 'all'
    ? allTasks.filter((t) => {
        if (t.completed_at !== null && !showCompleted) return false;
        if (t.deprioritized_at != null && t.completed_at === null && !showDeprioritized) return false;
        return true;
      })
    : allTasks;

  const toggleComplete = async (task: typeof allTasks[number]) => {
    if (!secret) return;
    const completed = task.completed_at === null;
    mutate(
      { tasks: allTasks.map((t) => t.id === task.id ? { ...t, completed_at: completed ? Math.floor(Date.now() / 1000) : null } : t) },
      false,
    );
    try {
      const updated = await patchTask(task.id, { completed }, secret);
      mutate(
        { tasks: allTasks.map((t) => (t.id === task.id ? updated : t)) },
        false,
      );
    } catch {
      mutate();
    }
  };

  const toggleDeprioritize = async (task: typeof allTasks[number]) => {
    if (!secret) return;
    const deprioritized = task.deprioritized_at == null;
    mutate(
      { tasks: allTasks.map((t) => t.id === task.id ? { ...t, deprioritized_at: deprioritized ? Math.floor(Date.now() / 1000) : null } : t) },
      false,
    );
    try {
      const updated = await patchTask(task.id, { deprioritized }, secret);
      mutate(
        { tasks: allTasks.map((t) => (t.id === task.id ? updated : t)) },
        false,
      );
    } catch {
      mutate();
    }
  };

  return (
    <div className="tasks-view">
      <div className="tasks-header">
        <h2 className="tasks-title">Tasks</h2>
        <div className="tasks-toggles">
          <label className="tasks-toggle">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={() => setShowCompleted(!showCompleted)}
            />
            Show completed
          </label>
          <label className="tasks-toggle">
            <input
              type="checkbox"
              checked={showDeprioritized}
              onChange={() => setShowDeprioritized(!showDeprioritized)}
            />
            Show deprioritized
          </label>
        </div>
      </div>
      {secret && (
        <form
          className="task-add"
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
        >
          <input
            type="text"
            className="task-add-input"
            placeholder="Add a task…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={adding}
          />
          <button
            type="submit"
            className="task-add-btn"
            disabled={adding || !newTitle.trim()}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
          {addError && <span className="task-add-error">{addError}</span>}
        </form>
      )}
      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="thought-loading">No tasks</div>
      ) : (
        <ul className="tasks-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <div className="task-row">
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={task.completed_at !== null}
                  disabled={!secret}
                  onChange={() => toggleComplete(task)}
                  title="Complete"
                />
                <button
                  className={`task-deprioritize-btn${task.deprioritized_at != null ? ' task-deprioritize-btn--active' : ''}`}
                  disabled={!secret}
                  onClick={() => toggleDeprioritize(task)}
                  title="De-prioritize"
                >
                  −
                </button>
                <a
                  href={`#thought-${task.thought_id}`}
                  className={`task-title${task.completed_at !== null ? ' task-title--done' : ''}${task.deprioritized_at != null && task.completed_at === null ? ' task-title--deprioritized' : ''}`}
                >
                  {task.title}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
