-- Global version counter for cache invalidation (ETag support)
CREATE TABLE IF NOT EXISTS version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  counter INTEGER NOT NULL DEFAULT 0
);

INSERT INTO version (id, counter) VALUES (1, 0);
