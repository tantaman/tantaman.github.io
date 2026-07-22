-- Intentional curation: projects and spatial framings over thoughts, posts, and other loose items.
-- Polymorphic item ids intentionally are not foreign keys: resolving a heterogeneous target is an
-- application concern, while every concrete table still exposes one Rindle-compatible primary key.

CREATE TABLE project (
  id TEXT NOT NULL,
  thoughtId TEXT,
  authorId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt REAL NOT NULL,
  archivedAt REAL,
  PRIMARY KEY (id)
);
CREATE INDEX project_by_author ON project (authorId, status, createdAt DESC, id);
CREATE INDEX project_by_thought ON project (thoughtId, id);

CREATE TABLE taskDependency (
  id TEXT NOT NULL,
  blockerTaskId TEXT NOT NULL,
  blockedTaskId TEXT NOT NULL,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX task_dependency_unique ON taskDependency (blockerTaskId, blockedTaskId);
CREATE INDEX task_dependency_by_blocker ON taskDependency (blockerTaskId, blockedTaskId, id);
CREATE INDEX task_dependency_by_blocked ON taskDependency (blockedTaskId, blockerTaskId, id);

CREATE TABLE projectComment (
  id TEXT NOT NULL,
  projectId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  parentId TEXT,
  body TEXT NOT NULL,
  createdAt REAL NOT NULL,
  updatedAt REAL,
  PRIMARY KEY (id)
);
CREATE INDEX project_comment_by_project ON projectComment (projectId, createdAt, id);
CREATE INDEX project_comment_by_parent ON projectComment (parentId, createdAt, id);

CREATE TABLE projectActivity (
  id TEXT NOT NULL,
  projectId TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX project_activity_by_project ON projectActivity (projectId, createdAt DESC, id);

CREATE TABLE projectItem (
  id TEXT NOT NULL,
  projectId TEXT NOT NULL,
  itemType TEXT NOT NULL,
  itemId TEXT NOT NULL,
  role TEXT,
  position REAL,
  addedAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX project_item_unique ON projectItem (projectId, itemType, itemId);
CREATE INDEX project_item_by_project ON projectItem (projectId, position, addedAt, id);
CREATE INDEX project_item_by_target ON projectItem (itemType, itemId, projectId, id);

CREATE TABLE projectAttachment (
  id TEXT NOT NULL,
  projectId TEXT NOT NULL,
  storageKey TEXT NOT NULL,
  mediaType TEXT NOT NULL,
  fileName TEXT NOT NULL,
  createdAt REAL NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);
CREATE INDEX project_attachment_by_project ON projectAttachment (projectId, position, id);
CREATE UNIQUE INDEX project_attachment_storage_key ON projectAttachment (storageKey);

CREATE TABLE framing (
  id TEXT NOT NULL,
  authorId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  createdAt REAL NOT NULL,
  updatedAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX framing_by_author ON framing (authorId, updatedAt DESC, id);

CREATE TABLE framingNode (
  id TEXT NOT NULL,
  framingId TEXT NOT NULL,
  itemType TEXT NOT NULL,
  itemId TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  width REAL,
  height REAL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX framing_node_unique ON framingNode (framingId, itemType, itemId);
CREATE INDEX framing_node_by_framing ON framingNode (framingId, id);
CREATE INDEX framing_node_by_target ON framingNode (itemType, itemId, framingId, id);

CREATE TABLE framingEdge (
  id TEXT NOT NULL,
  framingId TEXT NOT NULL,
  sourceNodeId TEXT NOT NULL,
  targetNodeId TEXT NOT NULL,
  label TEXT,
  sourceHandle TEXT,
  targetHandle TEXT,
  kind TEXT,
  PRIMARY KEY (id)
);
CREATE INDEX framing_edge_by_framing ON framingEdge (framingId, id);
CREATE INDEX framing_edge_by_source ON framingEdge (sourceNodeId, id);
CREATE INDEX framing_edge_by_target ON framingEdge (targetNodeId, id);
