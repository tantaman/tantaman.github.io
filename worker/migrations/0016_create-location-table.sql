CREATE TABLE location (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lat REAL,
  lng REAL,
  resolved_name TEXT,
  created_at INTEGER NOT NULL
);
