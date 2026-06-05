-- Project activity: a lightweight, auto-recorded event stream per project (the
-- project hub's "activity history"). Server-side mutations append rows; this is
-- NOT a diff/version system, just a glanceable reverse-chron log. `kind` is a
-- short machine label (e.g. task_completed); `detail` is optional context (a
-- title). Cascades away with the project.
CREATE TABLE project_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_project_activity_project ON project_activity(project_id);
