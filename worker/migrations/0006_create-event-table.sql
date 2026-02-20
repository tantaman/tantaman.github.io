CREATE TABLE event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date_text TEXT NOT NULL,
  date_epoch INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_event_thought ON event(thought_id);
CREATE INDEX idx_event_date_epoch ON event(date_epoch);
