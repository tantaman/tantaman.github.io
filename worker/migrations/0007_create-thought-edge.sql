CREATE TABLE thought_edge (
  source_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  PRIMARY KEY (source_id, target_id)
);

CREATE INDEX idx_thought_edge_target ON thought_edge(target_id);
CREATE INDEX idx_thought_edge_score ON thought_edge(score DESC);
