-- Collaborative editing for documents (prosemirror-collab model).
--
-- `collab_version` is the canonical step-log version of the document — bumped
-- once per step accepted by the DocCollabRoom DO. `doc_json` is the latest
-- snapshot of the ProseMirror document, stringified. `body` (markdown) is
-- derived from `doc_json` at snapshot time and remains the source for the
-- static blog pipeline / search / MCP.

ALTER TABLE document ADD COLUMN collab_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE document ADD COLUMN doc_json TEXT;
