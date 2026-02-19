CREATE TABLE thought_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  attachment_key TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  attachment_name TEXT NOT NULL
);
CREATE INDEX idx_thought_attachment_thought ON thought_attachment(thought_id);
