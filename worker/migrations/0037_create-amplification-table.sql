CREATE TABLE amplification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  note TEXT,
  title TEXT,
  image_url TEXT,
  description TEXT,
  site_name TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_amplification_source ON amplification(source);
CREATE INDEX idx_amplification_created_at ON amplification(created_at DESC);
