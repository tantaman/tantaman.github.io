import { useContext, useEffect, useState } from 'react';
import type { Task } from '../types';
import { getTasks, patchTask } from '../api';
import { AuthContext } from '../App';

export function TasksView({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const tagsKey = tags.join(',');

  useEffect(() => {
    setLoading(true);
    getTasks(showAll ? 'all' : 'incomplete', tags.length > 0 ? tags : undefined)
      .then((r) => setTasks(r.tasks))
      .finally(() => setLoading(false));
  }, [showAll, tagsKey]);

  const toggleComplete = async (task: Task) => {
    if (!secret) return;
    const completed = task.completed_at === null;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completed_at: completed ? Math.floor(Date.now() / 1000) : null }
          : t,
      ),
    );
    try {
      const updated = await patchTask(task.id, completed, secret);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? task : t)),
      );
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
