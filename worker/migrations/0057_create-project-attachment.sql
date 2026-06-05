-- Project attachments: files uploaded directly to a project (M1d), parallel to
-- thought_attachment. Bytes live in R2 under projects/{id}/{name}; this table is
-- the index. Rows cascade with the project, but R2 objects are GC'd manually
-- (same caveat as thoughts — see the thought-delete BUCKET.delete path).
CREATE TABLE project_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  attachment_key TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_project_attachment_project ON project_attachment(project_id);
