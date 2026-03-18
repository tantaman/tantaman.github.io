CREATE TABLE question (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  answered_at INTEGER
);
CREATE INDEX idx_question_thought ON question(thought_id);
