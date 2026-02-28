CREATE TABLE bookmark (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE thought_bookmark (
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  bookmark_id INTEGER NOT NULL REFERENCES bookmark(id) ON DELETE CASCADE,
  PRIMARY KEY (thought_id, bookmark_id)
);

CREATE INDEX idx_thought_bookmark_bookmark ON thought_bookmark(bookmark_id);
