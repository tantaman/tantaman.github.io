import { useContext, useState } from 'react';
import { patchTask } from '../api';
import { AuthContext } from '../App';
import { useTasks } from '../hooks/useCache';

export function TasksView({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeprioritized, setShowDeprioritized] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const status = showCompleted || showDeprioritized ? 'all' : 'incomplete';
  const { data, mutate } = useTasks(status, tags);
  const allTasks = data?.tasks ?? [];
  const loading = !data;

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
                <button
                  className={`task-title${task.completed_at !== null ? ' task-title--done' : ''}${task.deprioritized_at != null && task.completed_at === null ? ' task-title--deprioritized' : ''}`}
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                >
                  {task.title}
                </button>
              </div>
              {expandedId === task.id && task.description && (
                <div className="task-description">{task.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
