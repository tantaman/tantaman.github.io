-- A framing is a curated arrangement, and the arrangement itself can be as sensitive as the thoughts
-- it holds. Give the canvas its own visibility flag so an author can withhold a whole framing without
-- having to make every member private (and so a nested framing node hides with its target).

ALTER TABLE framing ADD COLUMN private REAL NOT NULL DEFAULT 0;

-- The reader list is a bounded newest-first window over public framings; the admin list is the same
-- window unfiltered. Both are served by the leading-column form of this index.
CREATE INDEX framing_by_privacy ON framing (private, updatedAt DESC, id);
