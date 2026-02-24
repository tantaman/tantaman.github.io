-- Generalize framing placements from thought-only to support multiple node types
-- (thought, post, etc.)

-- 1. Create the new framing_node table
CREATE TABLE framing_node (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  framing_id INTEGER NOT NULL REFERENCES framing(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'thought',
  item_id TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  w REAL,
  h REAL,
  UNIQUE(framing_id, node_type, item_id)
);

-- 2. Migrate existing framing_thought data into framing_node
INSERT INTO framing_node (id, framing_id, node_type, item_id, x, y, w, h)
  SELECT id, framing_id, 'thought', CAST(thought_id AS TEXT), x, y, w, h
  FROM framing_thought;

-- 3. Create new edge table referencing framing_node PKs
CREATE TABLE framing_edge_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  framing_id INTEGER NOT NULL REFERENCES framing(id) ON DELETE CASCADE,
  source_node_id INTEGER NOT NULL REFERENCES framing_node(id) ON DELETE CASCADE,
  target_node_id INTEGER NOT NULL REFERENCES framing_node(id) ON DELETE CASCADE,
  label TEXT,
  source_handle TEXT,
  target_handle TEXT
);

-- 4. Migrate existing edges by resolving composite FK to framing_node PK
INSERT INTO framing_edge_v2 (id, framing_id, source_node_id, target_node_id, label, source_handle, target_handle)
  SELECT e.id, e.framing_id, sn.id, tn.id, e.label, e.source_handle, e.target_handle
  FROM framing_edge e
  JOIN framing_node sn ON sn.framing_id = e.framing_id AND sn.node_type = 'thought' AND sn.item_id = CAST(e.source_thought_id AS TEXT)
  JOIN framing_node tn ON tn.framing_id = e.framing_id AND tn.node_type = 'thought' AND tn.item_id = CAST(e.target_thought_id AS TEXT);

-- 5. Drop old tables
DROP TABLE framing_edge;
DROP TABLE framing_thought;

-- 6. Rename new edge table
ALTER TABLE framing_edge_v2 RENAME TO framing_edge;
