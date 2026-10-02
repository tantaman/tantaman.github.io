-- File bytes stay in object storage; access requires a committed paste reference.
CREATE TABLE pasteAttachment (
  id TEXT NOT NULL PRIMARY KEY,
  pasteId TEXT NOT NULL,
  storageKey TEXT NOT NULL,
  mediaType TEXT NOT NULL,
  fileName TEXT NOT NULL,
  createdAt REAL NOT NULL,
  position REAL NOT NULL
);
CREATE INDEX paste_attachment_by_key ON pasteAttachment (storageKey);
CREATE INDEX paste_attachment_by_paste ON pasteAttachment (pasteId, position, id);
