CREATE TABLE IF NOT EXISTS thought (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  body TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_thought_timestamp ON thought(timestamp);
