-- Project comments: a lightweight discussion thread per project, decoupled from
-- thoughts (the project hub's "conversation history"). Single-author (the site
-- owner); replies nest via parent_id. Bodies are markdown.
CREATE TABLE project_comment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES project_comment(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX idx_project_comment_project ON project_comment(project_id);
CREATE INDEX idx_project_comment_parent ON project_comment(parent_id);
