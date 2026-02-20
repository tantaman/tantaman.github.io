import { useContext, useState } from 'react';
import { patchTask } from '../api';
import { AuthContext } from '../App';
import { useTasks } from '../hooks/useCache';

export function TasksView({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, mutate } = useTasks(showAll, tags);
  const tasks = data?.tasks ?? [];
  const loading = !data;

  const toggleComplete = async (task: typeof tasks[number]) => {
    if (!secret) return;
    const completed = task.completed_at === null;
    // Optimistic update
    mutate(
      { tasks: tasks.map((t) => t.id === task.id ? { ...t, completed_at: completed ? Math.floor(Date.now() / 1000) : null } : t) },
      false,
    );
    try {
      const updated = await patchTask(task.id, completed, secret);
      mutate(
        { tasks: tasks.map((t) => (t.id === task.id ? updated : t)) },
        false,
      );
    } catch {
      // Revert by revalidating from server
      mutate();
    }
  };

  return (
    <div className="tasks-view">
      <div className="tasks-header">
        <h2 className="tasks-title">Tasks</h2>
        <label className="tasks-toggle">
          <input
            type="checkbox"
            checked={showAll}
            onChange={() => setShowAll(!showAll)}
          />
          Show completed
        </label>
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
                />
                <button
                  className={`task-title${task.completed_at !== null ? ' task-title--done' : ''}`}
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
