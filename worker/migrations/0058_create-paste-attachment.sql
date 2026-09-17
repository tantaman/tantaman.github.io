-- Paste attachments: files uploaded alongside a paste, parallel to
-- thought_attachment and project_attachment. Bytes live in R2 under
-- pastes/{paste_id}/{ts}-{name}; this table is the index.
--
-- This is also the "file store": a paste with an empty body and N files is a
-- file drop, and /paste/files lists every attachment across every paste. Keeping
-- paste.body TEXT (rather than turning it into a blob) leaves embeddings, TTS,
-- splash cards, diff, fork and raw untouched.
--
-- Forking copies the rows but NOT the bytes: a fork's attachment_key still
-- points at the source paste's R2 object, so a fork chain shares one copy.
-- Safe today because pastes are never deleted; any future delete path must
-- check for other rows referencing the key before calling BUCKET.delete (the
-- single-attachment delete below does exactly that).
CREATE TABLE paste_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paste_id TEXT NOT NULL REFERENCES paste(id) ON DELETE CASCADE,
  attachment_key TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_paste_attachment_paste ON paste_attachment(paste_id);
CREATE INDEX idx_paste_attachment_created ON paste_attachment(created_at);
