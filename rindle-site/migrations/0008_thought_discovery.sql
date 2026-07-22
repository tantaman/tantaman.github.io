-- Materialized discovery results derived outside the deterministic shared mutators. Embeddings stay
-- in the vector service; small renderable cluster assignments live in Rindle so normal subscriptions
-- receive them. Projection versions prevent an older clustering run from publishing stale results.

CREATE TABLE cluster (
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  size REAL NOT NULL DEFAULT 0,
  projectionVersion TEXT NOT NULL,
  createdAt REAL NOT NULL,
  updatedAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX cluster_by_size ON cluster (size DESC, id);

CREATE TABLE clusterMembership (
  id TEXT NOT NULL,
  itemKind TEXT NOT NULL,
  itemId TEXT NOT NULL,
  clusterId TEXT NOT NULL,
  rank REAL NOT NULL,
  distance REAL NOT NULL,
  title TEXT,
  preview TEXT,
  projectionVersion TEXT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX cluster_membership_unique ON clusterMembership (itemKind, itemId, clusterId);
CREATE INDEX cluster_membership_by_cluster ON clusterMembership (clusterId, distance, id);
CREATE INDEX cluster_membership_by_item ON clusterMembership (itemKind, itemId, rank, id);
