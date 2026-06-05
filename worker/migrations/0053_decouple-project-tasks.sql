-- Refinement: decouple project tasks from thoughts. A thought (#p/#t) is now
-- only a fast way to *bootstrap* a project; once a project exists its tasks are
-- first-class records edited directly, never round-tripped through thoughts.

-- 0. project.thought_id becomes nullable: projects can be created directly from
--    the UI (no seed thought), and deleting a seed thought should not delete an
--    adopted project. Relax NOT NULL and switch the FK to ON DELETE SET NULL.
CREATE TABLE project_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER REFERENCES thought(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);
INSERT INTO project_new (id, thought_id, title, description, status, created_at, archived_at)
  SELECT id, thought_id, title, description, status, created_at, archived_at FROM project;
DROP TABLE project;
ALTER TABLE project_new RENAME TO project;
CREATE INDEX idx_project_thought ON project(thought_id);

-- 1. task.thought_id becomes nullable provenance (project-native tasks have
--    none) and deleting the source thought no longer deletes the task — the
--    project owns it. Also add an explicit ordering position. SQLite needs a
--    table rebuild to relax the NOT NULL / change the FK action.
CREATE TABLE task_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER REFERENCES thought(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  deprioritized_at INTEGER,
  project_id INTEGER REFERENCES project(id) ON DELETE SET NULL,
  position INTEGER
);
INSERT INTO task_new (id, thought_id, title, description, created_at, completed_at, deprioritized_at, project_id)
  SELECT id, thought_id, title, description, created_at, completed_at, deprioritized_at, project_id FROM task;
DROP TABLE task;
ALTER TABLE task_new RENAME TO task;
CREATE INDEX idx_task_thought ON task(thought_id);
CREATE INDEX idx_task_project ON task(project_id);

-- 2. Dependencies are now task-level (a true DAG), the single source of truth
--    for project blocking. Replaces the reply-tree / thought_edge derivation.
CREATE TABLE task_dependency (
  blocker_task_id INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  blocked_task_id INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  PRIMARY KEY (blocker_task_id, blocked_task_id)
);
CREATE INDEX idx_task_dependency_blocked ON task_dependency(blocked_task_id);

-- 3. Backfill existing project dependencies into task_dependency.
--    (a) reply tree: a task whose source thought's parent also has a task in the
--        same project — the parent task blocks the child.
INSERT OR IGNORE INTO task_dependency (blocker_task_id, blocked_task_id)
SELECT pt.id, ct.id
FROM task ct
JOIN thought c ON c.id = ct.thought_id
JOIN task pt ON pt.thought_id = c.parent_id AND pt.project_id = ct.project_id
WHERE ct.project_id IS NOT NULL AND c.parent_id IS NOT NULL AND pt.id <> ct.id;

--    (b) explicit `blocks` edges between task thoughts in the same project.
INSERT OR IGNORE INTO task_dependency (blocker_task_id, blocked_task_id)
SELECT bt.id, kt.id
FROM thought_edge e
JOIN task bt ON bt.thought_id = e.source_id
JOIN task kt ON kt.thought_id = e.target_id AND kt.project_id = bt.project_id
WHERE e.kind = 'blocks' AND bt.project_id IS NOT NULL AND bt.id <> kt.id;
