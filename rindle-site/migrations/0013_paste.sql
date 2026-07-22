-- Paste text and metadata move together from the legacy D1 `paste` row into Rindle. Keeping the
-- authoritative body in the same transaction as its title, language, fork, and sharing state makes
-- every subscribed view atomically correct after a write. R2 remains a cache for derived binary
-- artifacts (splash cards / audio); it is not the source of truth for paste text.

CREATE TABLE paste (
  id TEXT NOT NULL,
  authorId TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'markdown',
  title TEXT,
  createdAt REAL NOT NULL,
  parentId TEXT,
  shared REAL NOT NULL DEFAULT 0,
  sharedAt REAL,
  PRIMARY KEY (id)
);

-- Public and private lists are bounded newest-first leaf windows. A correlated NOT EXISTS over
-- parentId removes superseded revisions while remaining live as forks are inserted.
CREATE INDEX paste_by_created ON paste (createdAt DESC, id);
CREATE INDEX paste_by_parent ON paste (parentId, createdAt, id);
CREATE INDEX paste_shared_feed ON paste (shared, sharedAt DESC, id);
CREATE INDEX paste_by_author ON paste (authorId, createdAt DESC, id);
