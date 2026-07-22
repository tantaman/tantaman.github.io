-- Tasks and projects intentionally survive deletion of their source thought. Persist capture-time
-- visibility on those independent rows so detaching provenance can never turn a private capture
-- into a public one.

ALTER TABLE task ADD COLUMN private REAL NOT NULL DEFAULT 0;
CREATE INDEX task_by_privacy ON task (private, createdAt DESC, id);

ALTER TABLE project ADD COLUMN private REAL NOT NULL DEFAULT 0;
CREATE INDEX project_by_privacy ON project (private, status, createdAt DESC, id);
