ALTER TABLE pasteAttachment ADD COLUMN size REAL NOT NULL DEFAULT 0;

-- One object can have references in many fork revisions. Retain retired object IDs so a
-- concurrent/replayed attachment cannot resurrect bytes while storage cleanup deletes them.
CREATE TABLE pasteFile (
  id TEXT NOT NULL PRIMARY KEY,
  fileName TEXT NOT NULL,
  mediaType TEXT NOT NULL,
  size REAL NOT NULL,
  createdAt REAL NOT NULL,
  state TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX paste_file_recent ON pasteFile (state, createdAt DESC, id);
CREATE INDEX paste_attachment_name ON pasteAttachment (pasteId, fileName);

