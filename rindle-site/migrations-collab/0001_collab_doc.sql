-- The index of collaboratively edited documents (server/collab-doc.ts). Each document's Durable
-- Object owns its content; this row is a debounced copy for listing and search.
CREATE TABLE collab_doc (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX collab_doc_updated ON collab_doc (updated_at DESC);
