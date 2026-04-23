CREATE TABLE cluster (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE cluster_membership (
  item_kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL REFERENCES cluster(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  distance REAL NOT NULL,
  title TEXT,
  preview TEXT,
  PRIMARY KEY (item_kind, item_id, cluster_id)
);
CREATE INDEX idx_cluster_membership_cluster ON cluster_membership(cluster_id, distance);
CREATE INDEX idx_cluster_membership_item ON cluster_membership(item_kind, item_id);
