CREATE TABLE pasteComment (
  id TEXT PRIMARY KEY NOT NULL,
  pasteId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  authorName TEXT NOT NULL,
  parentId TEXT,
  body TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  deletedAt INTEGER
);
CREATE INDEX paste_comment_thread ON pasteComment (pasteId, createdAt, id);
CREATE INDEX paste_comment_parent ON pasteComment (parentId, createdAt, id);
