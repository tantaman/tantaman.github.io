-- Fold the post table into document. A document can now be:
--   status = 'document'  (default; personal note, not a post)
--   status = 'draft'     (post in authoring)
--   status = 'published' (live post)
-- slug + frontmatter are optional and only meaningful when status != 'document'.

ALTER TABLE document ADD COLUMN slug TEXT;
ALTER TABLE document ADD COLUMN status TEXT NOT NULL DEFAULT 'document' CHECK (status IN ('document', 'draft', 'published'));
ALTER TABLE document ADD COLUMN frontmatter TEXT NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX idx_document_slug ON document(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_document_status ON document(status);

-- Backfill existing post rows into document. The post table is left in place
-- for now and will be dropped in a later migration once the new flow is proven.
INSERT INTO document (title, body, private, slug, status, frontmatter, created_at, updated_at)
SELECT title, body, 0, slug, status, frontmatter, created_at, updated_at FROM post;
