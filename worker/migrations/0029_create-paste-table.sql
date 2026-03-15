CREATE TABLE paste (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'markdown',
  title TEXT,
  created_at INTEGER NOT NULL
);
