-- Project items: the generic linking layer (M1d). Mirrors framing_node's
-- (node_type, item_id) generalization so "attach anything" is one code path.
-- Rows are loose references — item_id is a string id/slug, NOT a foreign key, so
-- a deleted target leaves a dangling row that resolves to "(missing)" in the hub
-- (same trust model as framing_node). Tasks stay native (own table); this table
-- is only for *linked* existing items (documents, thoughts, bookmarks, framings,
-- posts, pastes). `role` is optional context ('spec'|'reference'|...).
CREATE TABLE project_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  role TEXT,
  position INTEGER,
  added_at INTEGER NOT NULL,
  UNIQUE(project_id, item_type, item_id)
);
CREATE INDEX idx_project_item_project ON project_item(project_id);
