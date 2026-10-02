ALTER TABLE paste ADD COLUMN contentRevision TEXT NOT NULL DEFAULT '';
ALTER TABLE paste ADD COLUMN updatedAt REAL;

CREATE TABLE pasteRevision (
  id TEXT NOT NULL PRIMARY KEY,
  pasteId TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT,
  excerpt TEXT NOT NULL,
  savedAt REAL NOT NULL,
  authorId TEXT NOT NULL
);
CREATE INDEX paste_revision_window ON pasteRevision (pasteId, savedAt DESC, id);
