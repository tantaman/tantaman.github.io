-- Projects: extracted from `#p <title>` like task/event/question. A project is
-- a root thought; its tasks are `#t` thoughts in its reply subtree, and the
-- reply tree (plus explicit `blocks` edges below) gives the dependency graph.
CREATE TABLE project (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);
CREATE INDEX idx_project_thought ON project(thought_id);

-- Tasks carry a denormalized project_id, stamped at create-time by walking the
-- reply ancestors to the nearest `#p` thought. NULL for tasks outside a project.
ALTER TABLE task ADD COLUMN project_id INTEGER REFERENCES project(id) ON DELETE SET NULL;
CREATE INDEX idx_task_project ON task(project_id);

-- Generalize thought_edge with a `kind` so dependency ("blocks") edges can
-- coexist with content links ("link") between the same pair without conflating
-- the two. Existing rows are content links (mirrors framing_edge.kind, 0041).
CREATE TABLE thought_edge_new (
  source_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'link',
  PRIMARY KEY (source_id, target_id, kind)
);
INSERT INTO thought_edge_new (source_id, target_id, kind)
  SELECT source_id, target_id, 'link' FROM thought_edge;
DROP TABLE thought_edge;
ALTER TABLE thought_edge_new RENAME TO thought_edge;
CREATE INDEX idx_thought_edge_target ON thought_edge(target_id);
CREATE INDEX idx_thought_edge_kind ON thought_edge(kind);
