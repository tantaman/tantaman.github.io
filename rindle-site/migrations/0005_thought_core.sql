-- Core short-form thought substrate.
--
-- This is a clean port of the FINAL D1 model, not a replay of its migration history. In
-- particular, stable-row history is written explicitly by the shared editThought mutator; Rindle
-- does not use triggers. IDs and timestamps are supplied by mutation callsites so optimistic replay
-- is deterministic. Legacy numeric ids may be imported as their decimal TEXT representation while
-- newly-created rows use ULIDs.

CREATE TABLE thought (
  id TEXT NOT NULL,
  authorId TEXT NOT NULL,
  body TEXT NOT NULL,
  bodyHash TEXT NOT NULL,
  createdAt REAL NOT NULL,
  updatedAt REAL NOT NULL,
  version REAL NOT NULL DEFAULT 1,
  parentId TEXT,
  color TEXT,
  private REAL NOT NULL DEFAULT 0,
  contentRevision TEXT NOT NULL,
  colorRevision TEXT,
  colorProjectionVersion TEXT,
  colorStatus TEXT NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id)
);

-- Public and private feeds are bounded newest-first windows over root thoughts. Replies use the
-- parent index; the id tiebreak makes both orders total.
CREATE INDEX thought_feed ON thought (private, parentId, createdAt DESC, id);
CREATE INDEX thought_by_parent ON thought (parentId, createdAt, id);
CREATE INDEX thought_by_author ON thought (authorId, createdAt DESC, id);
CREATE INDEX thought_by_body_hash ON thought (bodyHash, id);

-- A prior version is inserted here immediately before editThought updates the stable thought row.
-- `writtenAt` is when that body became current; `replacedAt` is when it was superseded.
CREATE TABLE thoughtHistory (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  version REAL NOT NULL,
  body TEXT NOT NULL,
  bodyHash TEXT NOT NULL,
  writtenAt REAL NOT NULL,
  replacedAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX thought_history_version ON thoughtHistory (thoughtId, version);
CREATE INDEX thought_history_by_thought ON thoughtHistory (thoughtId, version, id);

-- Object bytes remain in external object storage; this is the subscription-friendly metadata.
CREATE TABLE thoughtAttachment (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  storageKey TEXT NOT NULL,
  mediaType TEXT NOT NULL,
  fileName TEXT NOT NULL,
  createdAt REAL NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX thought_attachment_by_thought ON thoughtAttachment (thoughtId, position, id);
CREATE UNIQUE INDEX thought_attachment_storage_key ON thoughtAttachment (storageKey);

-- `normalizedName` is the lower-cased identity used for deduplication; display spelling stays in
-- `name`. Junction rows have their own id because every registered Rindle table has one primary key.
CREATE TABLE tag (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  normalizedName TEXT NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX tag_normalized_name ON tag (normalizedName);

CREATE TABLE thoughtTag (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  tagId TEXT NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX thought_tag_unique ON thoughtTag (thoughtId, tagId);
CREATE INDEX thought_tag_by_thought ON thoughtTag (thoughtId, position, id);
CREATE INDEX thought_tag_by_tag ON thoughtTag (tagId, thoughtId, id);

-- Explicit thought links and project/dependency semantics can coexist by `kind` without overloading
-- reply parentage. The shared mutator rejects self-links before writing.
CREATE TABLE thoughtEdge (
  id TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  targetId TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'link',
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX thought_edge_unique ON thoughtEdge (sourceId, targetId, kind);
CREATE INDEX thought_edge_by_source ON thoughtEdge (sourceId, kind, targetId, id);
CREATE INDEX thought_edge_by_target ON thoughtEdge (targetId, kind, sourceId, id);
