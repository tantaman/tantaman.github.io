CREATE TABLE framing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE framing_thought (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  framing_id INTEGER NOT NULL REFERENCES framing(id) ON DELETE CASCADE,
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  w REAL,
  h REAL,
  UNIQUE(framing_id, thought_id)
);

CREATE INDEX idx_framing_thought_framing ON framing_thought(framing_id);
CREATE INDEX idx_framing_thought_thought ON framing_thought(thought_id);

CREATE TABLE framing_edge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  framing_id INTEGER NOT NULL REFERENCES framing(id) ON DELETE CASCADE,
  source_thought_id INTEGER NOT NULL,
  target_thought_id INTEGER NOT NULL,
  label TEXT,
  FOREIGN KEY (framing_id, source_thought_id)
    REFERENCES framing_thought(framing_id, thought_id) ON DELETE CASCADE,
  FOREIGN KEY (framing_id, target_thought_id)
    REFERENCES framing_thought(framing_id, thought_id) ON DELETE CASCADE
);

CREATE INDEX idx_framing_edge_framing ON framing_edge(framing_id);
CREATE INDEX idx_framing_edge_source ON framing_edge(framing_id, source_thought_id);
CREATE INDEX idx_framing_edge_target ON framing_edge(framing_id, target_thought_id);
