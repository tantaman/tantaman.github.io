CREATE TABLE task (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX idx_task_thought ON task(thought_id);
