CREATE TABLE IF NOT EXISTS thought (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT UNIQUE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_thought_sender ON thought(sender);
CREATE INDEX idx_thought_timestamp ON thought(timestamp);
